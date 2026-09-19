import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getApprovalRule, TASK_TYPES } from '../config/approvalRules';
const archiver = require('archiver');

const router = Router();

// ─── Multer Storage ─────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../data/uploads'));
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// ─── Helper: resolve attachment disk path ────────────────────────────────────
// storedName is always just the filename (e.g. "abc-xyz-report.pdf").
// Legacy tasks may have an absolute Windows path in the `path` field;
// we fall back to basename so they still work after moving the project.
const resolveAttachmentPath = (attachment: any): string =>
  path.join(
    __dirname,
    '../data/uploads',
    attachment.storedName || path.basename(attachment.path || '')
  );

// ─── Helper: find the exact approver user ID for a given role + department ───
const findApproverUserId = (
  approvalLevel: string,
  staffDepartmentName: string
): { userId: string | null; error: string | null } => {
  const departments = readData<any>('departments');
  const users = readData<any>('users');

  if (approvalLevel === 'HOD') {
    const dept = departments.find((d: any) => d.name === staffDepartmentName);
    if (!dept) {
      return { userId: null, error: `Department not found: "${staffDepartmentName}"` };
    }
    if (!dept.headId) {
      return { userId: null, error: `No HOD assigned to department "${staffDepartmentName}"` };
    }
    // Verify HOD user actually exists
    const hodUser = users.find((u: any) => u.id === dept.headId);
    if (!hodUser) {
      return { userId: null, error: `HOD user id "${dept.headId}" not found in users` };
    }
    return { userId: dept.headId, error: null };
  }

  if (approvalLevel === 'Dean') {
    const dean = users.find((u: any) => u.role === 'Dean' && u.status === 'Active');
    if (!dean) return { userId: null, error: 'No active Dean found' };
    return { userId: dean.id, error: null };
  }

  if (approvalLevel === 'Principal') {
    const principal = users.find((u: any) => u.role === 'Principal' && u.status === 'Active');
    if (!principal) return { userId: null, error: 'No active Principal found' };
    return { userId: principal.id, error: null };
  }

  return { userId: null, error: `Unknown approval level: "${approvalLevel}"` };
};

// ─── GET /tasks — list tasks visible to the authenticated user ───────────────
router.get('/', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');

  const userTasks = tasks.filter((t: any) =>
    t.createdBy.userId === user.userId ||
    (t.assignedTo && t.assignedTo.userId === user.userId) ||
    t.currentApproverId === user.userId   // approver can also see the task in their list
  );
  res.json(userTasks);
});

// ─── GET /tasks/task-types — return configured task types ────────────────────
router.get('/task-types', (_req, res) => {
  res.json(TASK_TYPES);
});

// ─── POST /tasks — create a new task ─────────────────────────────────────────
router.post('/', upload.array('files'), (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');

  const { title, description, priority, dueDate, taskType } = req.body;

  // Staff always self-assign (frontend hides assignment for Staff).
  // For non-Staff roles the existing SELF/ASSIGNED pattern is preserved.
  const assignmentType = req.body.assignmentType || 'SELF';
  const assignedToId   = req.body.assignedToId;

  let assignedTo: any = null;

  if (assignmentType === 'ASSIGNED') {
    if (user.role === 'Staff') {
      return res.status(403).json({ message: 'Staff cannot assign tasks to others' });
    }
    const users = readData<any>('users');
    const targetUser = users.find((u: any) => u.id === assignedToId);
    if (!targetUser) return res.status(400).json({ message: 'Assigned user not found' });
    assignedTo = { userId: targetUser.id, name: targetUser.name, role: targetUser.role };
  } else {
    // SELF
    assignedTo = { userId: user.userId, name: user.name, role: user.role };
  }

  const attachments = ((req as any).files || []).map((file: any) => ({
    id: uuidv4(),
    originalName: file.originalname,
    storedName: file.filename,      // filename only — location-independent
    mimeType: file.mimetype,
    size: file.size
  }));

  const newTask: any = {
    id: uuidv4(),
    title,
    description,
    priority,
    dueDate,
    taskType: taskType || null,      // stored for approval routing on submit
    createdBy: { userId: user.userId, name: user.name, role: user.role },
    assignmentType,
    assignedTo,
    attachments,
    status: 'DRAFT',
    currentApproverRole: null,
    currentApproverId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [{
      action: 'CREATED',
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      timestamp: new Date().toISOString()
    }]
  };

  if (assignmentType === 'ASSIGNED') {
    newTask.timeline.push({
      action: 'ASSIGNED',
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      timestamp: new Date().toISOString()
    });
  }

  tasks.push(newTask);
  writeData('tasks', tasks);

  res.status(201).json(newTask);
});

// ─── GET /tasks/:id — get single task ────────────────────────────────────────
router.get('/:id', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const task = tasks.find((t: any) => t.id === req.params.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const canView =
    task.createdBy.userId === user.userId ||
    (task.assignedTo && task.assignedTo.userId === user.userId) ||
    task.currentApproverId === user.userId ||   // exact approver
    task.currentApproverRole === user.role ||   // backward compat for old tasks
    user.role === 'Admin';

  if (!canView) return res.status(403).json({ message: 'You do not have permission to view this task' });

  res.json(task);
});

// ─── POST /tasks/:id/submit — submit for approval ────────────────────────────
router.post('/:id/submit', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  // Only the assigned user can submit
  if (!task.assignedTo || task.assignedTo.userId !== user.userId) {
    return res.status(403).json({ message: 'Only the assigned user can submit this task' });
  }

  // Guard: do not allow re-submission of already-approved or already-pending tasks
  if (task.status === 'APPROVED') {
    return res.status(400).json({ message: 'Task is already approved and cannot be resubmitted' });
  }
  if (task.status === 'PENDING_APPROVAL' || task.status === 'SUBMITTED') {
    return res.status(400).json({ message: 'Task is already pending approval' });
  }

  // ── Determine approval routing ─────────────────────────────────────────────
  const taskType = task.taskType as string | null;

  if (!taskType) {
    return res.status(400).json({
      message: 'Task has no task type set. Cannot determine approval authority.'
    });
  }

  const rule = getApprovalRule(taskType);

  if (!rule) {
    return res.status(400).json({
      message: `Unknown task type "${taskType}". Cannot route for approval.`
    });
  }

  if (rule.approvalLevel === null) {
    return res.status(400).json({
      message: `Approval chain for task type "${taskType}" is not yet configured (TBD). Please contact the administrator.`
    });
  }

  // ── Resolve exact approver ─────────────────────────────────────────────────
  // Always read the staff's department from the server-side user record,
  // not from the JWT (which could be stale after a user record update).
  const allUsers = readData<any>('users');
  const staffRecord = allUsers.find((u: any) => u.id === user.userId);

  if (!staffRecord) {
    return res.status(400).json({ message: 'Authenticated user record not found' });
  }

  const { userId: approverId, error: lookupError } = findApproverUserId(
    rule.approvalLevel,
    staffRecord.department
  );

  if (lookupError || !approverId) {
    console.error(`[Submit] Approver lookup failed: ${lookupError}`);
    return res.status(400).json({
      message: `Unable to determine approval authority: ${lookupError}`
    });
  }

  // ── Apply status transition ────────────────────────────────────────────────
  task.status = 'PENDING_APPROVAL';
  task.currentApproverRole = rule.approvalLevel;
  task.currentApproverId = approverId;
  task.updatedAt = new Date().toISOString();

  task.timeline.push({
    action: 'SUBMITTED',
    actorId: user.userId,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString()
  });

  tasks[index] = task;
  writeData('tasks', tasks);

  // ── Server-side log for debugging ─────────────────────────────────────────
  console.log(`[Submit] taskId=${task.id} | taskType="${taskType}" | staffUserId=${user.userId}` +
    ` | staffDept="${staffRecord.department}" | approvalLevel=${rule.approvalLevel}` +
    ` | currentApproverId=${approverId} | status=PENDING_APPROVAL`);

  res.json(task);
});

// ─── GET /tasks/:id/attachments/:attachmentId/download ───────────────────────
router.get('/:id/attachments/:attachmentId/download', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const task = tasks.find((t: any) => t.id === req.params.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const canView =
    task.createdBy.userId === user.userId ||
    (task.assignedTo && task.assignedTo.userId === user.userId) ||
    task.currentApproverId === user.userId ||
    task.currentApproverRole === user.role ||
    user.role === 'Admin';

  if (!canView) return res.status(403).json({ message: 'You do not have permission to access these files' });

  const attachment = task.attachments.find((a: any) => a.id === req.params.attachmentId);
  if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

  const filePath = resolveAttachmentPath(attachment);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found on server' });
  }

  res.download(filePath, attachment.originalName);
});

// ─── GET /tasks/:id/download-all ─────────────────────────────────────────────
router.get('/:id/download-all', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const task = tasks.find((t: any) => t.id === req.params.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const canView =
    task.createdBy.userId === user.userId ||
    (task.assignedTo && task.assignedTo.userId === user.userId) ||
    task.currentApproverId === user.userId ||
    task.currentApproverRole === user.role ||
    user.role === 'Admin';

  if (!canView) return res.status(403).json({ message: 'You do not have permission to access these files' });

  if (!task.attachments || task.attachments.length === 0) {
    return res.status(404).json({ message: 'No attachments found' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="task-${task.id}-attachments.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err: any) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  task.attachments.forEach((attachment: any) => {
    const filePath = resolveAttachmentPath(attachment);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: attachment.originalName });
    }
  });

  archive.finalize();
});

export default router;
