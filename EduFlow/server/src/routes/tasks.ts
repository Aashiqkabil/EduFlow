import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getApprovalRule, TASK_TYPES } from '../config/approvalRules';
const archiver = require('archiver');

const router = Router();
// authenticateToken applied globally via index.ts for /api/tasks

// ─── Multer Storage ──────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../data/uploads'));
  },
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// ─── Helper: resolve attachment disk path (location-independent) ─────────────
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
    if (!dept) return { userId: null, error: `Department not found: "${staffDepartmentName}"` };
    if (!dept.headId) return { userId: null, error: `No HOD assigned to department "${staffDepartmentName}"` };
    const hodUser = users.find((u: any) => u.id === dept.headId);
    if (!hodUser) return { userId: null, error: `HOD user id "${dept.headId}" not found in users` };
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

// ─── Helper: add notification with optional taskId ──────────────────────────
const addNotification = (userId: string, title: string, message: string, type: string, taskId?: string) => {
  const notifications = readData<any>('notifications');
  const notif: any = {
    id: uuidv4(), userId, title, message, type, isRead: false,
    createdAt: new Date().toISOString()
  };
  if (taskId) notif.taskId = taskId;
  notifications.push(notif);
  writeData('notifications', notifications);
};

// ─── GET /api/tasks/task-types ────────────────────────────────────────────────
// Must come BEFORE /:id to avoid route conflict
router.get('/task-types', (_req, res) => {
  res.json(TASK_TYPES);
});

// ─── GET /api/tasks — list tasks visible to the authenticated user ────────────
router.get('/', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');

  const userTasks = tasks.filter((t: any) =>
    t.createdBy.userId === user.userId ||
    (t.assignedTo && t.assignedTo.userId === user.userId) ||
    t.currentApproverId === user.userId
  );
  res.json(userTasks);
});

// ─── POST /api/tasks — create a new task ─────────────────────────────────────
router.post('/', upload.array('files'), (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');

  const { title, description, priority, dueDate, taskType } = req.body || {};
  const assignmentType = (req.body && req.body.assignmentType) || 'SELF';
  const assignedToId = req.body && req.body.assignedToId;

  // Parse taskMeta (may arrive as JSON string from FormData)
  let taskMeta: any = {};
  if (req.body && req.body.taskMeta) {
    try { taskMeta = JSON.parse(req.body.taskMeta); } catch { taskMeta = req.body.taskMeta; }
  }

  // Staff cannot assign to others
  if (assignmentType === 'ASSIGNED' && user.role === 'Staff') {
    return res.status(403).json({ message: 'Staff cannot assign tasks to others' });
  }

  let assignedTo: any;
  if (assignmentType === 'ASSIGNED') {
    const allUsers = readData<any>('users');
    const targetUser = allUsers.find((u: any) => u.id === assignedToId);
    if (!targetUser) return res.status(400).json({ message: 'Assigned user not found' });

    // If a classId is provided, verify the staff actually handles that class
    if (taskMeta.classId) {
      const classes = readData<any>('classes');
      const cls = classes.find((c: any) => c.id === taskMeta.classId);
      if (cls && cls.handledByStaffId !== targetUser.id) {
        return res.status(400).json({
          message: `Staff "${targetUser.name}" does not handle class "${cls.name}"`
        });
      }
    }

    assignedTo = { userId: targetUser.id, name: targetUser.name, role: targetUser.role };
  } else {
    assignedTo = { userId: user.userId, name: user.name, role: user.role };
  }

  const attachments = ((req as any).files || []).map((file: any) => ({
    id: uuidv4(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size
  }));

  const now = new Date().toISOString();
  const newTask: any = {
    id: uuidv4(),
    title: title || `${taskType || 'Task'} — ${now.slice(0, 10)}`,
    description: description || '',
    priority: priority || 'Medium',
    dueDate,
    taskType: taskType || null,
    taskMeta,                          // class, semester, academicYear, task-specific fields
    createdBy: { userId: user.userId, name: user.name, role: user.role },
    assignmentType,
    assignedTo,
    attachments,
    // HOD-assigned tasks start as ASSIGNED; self-created tasks start as DRAFT
    status: assignmentType === 'ASSIGNED' ? 'ASSIGNED' : 'DRAFT',
    currentApproverRole: null,
    currentApproverId: null,
    createdAt: now,
    updatedAt: now,
    timeline: [{
      action: 'CREATED',
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      timestamp: now
    }]
  };

  if (assignmentType === 'ASSIGNED') {
    newTask.timeline.push({
      action: 'ASSIGNED',
      actorId: user.userId,
      actorName: user.name,
      actorRole: user.role,
      timestamp: now
    });

    // Notify assigned Staff — include taskId for deep-linking
    const className = taskMeta.className ? ` — Class: ${taskMeta.className}` : '';
    addNotification(
      assignedTo.userId,
      'New Task Assigned',
      `${user.name} (${user.role}) has assigned you: "${newTask.title}" [${taskType || 'Task'}]${className}`,
      'NEW_TASK_ASSIGNED',
      newTask.id
    );
  }

  tasks.push(newTask);
  writeData('tasks', tasks);

  res.status(201).json(newTask);
});

// ─── GET /api/tasks/:id — single task ────────────────────────────────────────
router.get('/:id', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const task = tasks.find((t: any) => t.id === req.params.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  const canView =
    task.createdBy.userId === user.userId ||
    (task.assignedTo && task.assignedTo.userId === user.userId) ||
    task.currentApproverId === user.userId ||
    task.currentApproverRole === user.role || // backward compat
    user.role === 'Admin';

  if (!canView) return res.status(403).json({ message: 'You do not have permission to view this task' });

  res.json(task);
});

// ─── PATCH /api/tasks/:id — update task fields (editing DRAFT / ASSIGNED / IN_PROGRESS / CHANGES_REQUESTED / REJECTED) ──
router.patch('/:id', upload.array('files'), (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  const isCreator = task.createdBy.userId === user.userId;
  const isAssignee = task.assignedTo && task.assignedTo.userId === user.userId;

  if (!isCreator && !isAssignee && user.role !== 'Admin') {
    return res.status(403).json({ message: 'You do not have permission to edit this task' });
  }

  const EDITABLE_STATUSES = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'REJECTED'];
  if (!EDITABLE_STATUSES.includes(task.status)) {
    return res.status(400).json({
      message: `Task cannot be edited in status "${task.status}"`
    });
  }

  const { title, description, priority, dueDate } = req.body || {};
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;

  if (req.body && req.body.taskMeta) {
    try {
      const incoming = typeof req.body.taskMeta === 'string'
        ? JSON.parse(req.body.taskMeta) : req.body.taskMeta;
      task.taskMeta = { ...(task.taskMeta || {}), ...incoming };
    } catch { /* ignore parse error */ }
  }

  const newFiles = ((req as any).files || []).map((file: any) => ({
    id: uuidv4(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size
  }));

  if (newFiles.length > 0) {
    task.attachments = [...(task.attachments || []), ...newFiles];
  }

  task.updatedAt = new Date().toISOString();
  task.timeline.push({
    action: 'UPDATED',
    actorId: user.userId,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString()
  });

  tasks[index] = task;
  writeData('tasks', tasks);

  res.json(task);
});

// ─── POST /api/tasks/:id/start — Staff marks ASSIGNED task as IN_PROGRESS ────
router.post('/:id/start', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  if (!task.assignedTo || task.assignedTo.userId !== user.userId) {
    return res.status(403).json({ message: 'Only the assigned user can start this task' });
  }
  if (task.status !== 'ASSIGNED') {
    return res.status(400).json({ message: `Cannot start task from status "${task.status}"` });
  }

  task.status = 'IN_PROGRESS';
  task.updatedAt = new Date().toISOString();
  task.timeline.push({
    action: 'STARTED',
    actorId: user.userId,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString()
  });

  tasks[index] = task;
  writeData('tasks', tasks);

  res.json(task);
});

// ─── POST /api/tasks/:id/submit — submit for approval ────────────────────────
//
// Status lifecycle that allows submission:
//   DRAFT             → PENDING_APPROVAL  (Staff self-created)
//   ASSIGNED          → PENDING_APPROVAL  (HOD-assigned, direct submit without starting)
//   IN_PROGRESS       → PENDING_APPROVAL  (HOD-assigned, after starting)
//   CHANGES_REQUESTED → PENDING_APPROVAL  (resubmit after HOD requested changes)
//   REJECTED          → PENDING_APPROVAL  (resubmit after rejection)
//
router.post('/:id/submit', upload.array('files'), (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  // Only the assignee can submit
  if (!task.assignedTo || task.assignedTo.userId !== user.userId) {
    return res.status(403).json({ message: 'Only the assigned user can submit this task' });
  }

  // Status guard
  if (task.status === 'APPROVED') {
    return res.status(400).json({ message: 'Task is already approved and cannot be resubmitted' });
  }
  if (task.status === 'PENDING_APPROVAL') {
    return res.status(400).json({ message: 'Task is already pending approval' });
  }

  const SUBMITTABLE = ['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'REJECTED'];
  if (!SUBMITTABLE.includes(task.status)) {
    return res.status(400).json({ message: `Task cannot be submitted from status "${task.status}"` });
  }

  // Accept taskMeta updates submitted along with the submission (e.g. Staff adds averageAttendance)
  if (req.body && req.body.taskMeta) {
    try {
      const incoming = typeof req.body.taskMeta === 'string'
        ? JSON.parse(req.body.taskMeta) : req.body.taskMeta;
      task.taskMeta = { ...(task.taskMeta || {}), ...incoming };
    } catch { /* ignore */ }
  }

  // Accept new files uploaded at submission time
  const newFiles = ((req as any).files || []).map((file: any) => ({
    id: uuidv4(),
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size
  }));
  if (newFiles.length > 0) {
    task.attachments = [...(task.attachments || []), ...newFiles];
  }

  // ── Approval routing ───────────────────────────────────────────────────────
  const taskType = task.taskType as string | null;
  if (!taskType) {
    return res.status(400).json({ message: 'Task has no task type set. Cannot determine approval authority.' });
  }

  const rule = getApprovalRule(taskType);
  if (!rule) {
    return res.status(400).json({ message: `Unknown task type "${taskType}". Cannot route for approval.` });
  }
  if (rule.approvalLevel === null) {
    return res.status(400).json({
      message: `Approval chain for task type "${taskType}" is not yet configured (TBD). Please contact the administrator.`
    });
  }

  // Always read department from server-side user record (never trust JWT for security)
  const allUsers = readData<any>('users');
  const submitterRecord = allUsers.find((u: any) => u.id === user.userId);
  if (!submitterRecord) {
    return res.status(400).json({ message: 'Authenticated user record not found' });
  }

  const { userId: approverId, error: lookupError } = findApproverUserId(
    rule.approvalLevel,
    submitterRecord.department
  );

  if (lookupError || !approverId) {
    console.error(`[Submit] Approver lookup failed: ${lookupError}`);
    return res.status(400).json({ message: `Unable to determine approval authority: ${lookupError}` });
  }

  // ── Apply transition ───────────────────────────────────────────────────────
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

  console.log(
    `[Submit] taskId=${task.id} | taskType="${taskType}" | submitterId=${user.userId}` +
    ` | dept="${submitterRecord.department}" | approvalLevel=${rule.approvalLevel}` +
    ` | currentApproverId=${approverId} | status=PENDING_APPROVAL`
  );

  res.json(task);
});

// ─── DELETE /api/tasks/:id — hard delete (DRAFT / REJECTED only) ─────────────
router.delete('/:id', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  if (task.createdBy.userId !== user.userId && user.role !== 'Admin') {
    return res.status(403).json({ message: 'Only the task creator can delete this task' });
  }

  const DELETABLE = ['DRAFT', 'REJECTED'];
  if (!DELETABLE.includes(task.status)) {
    return res.status(400).json({
      message: `Cannot delete a task with status "${task.status}". Only DRAFT and REJECTED tasks may be deleted.`
    });
  }

  // Clean up uploaded files
  (task.attachments || []).forEach((att: any) => {
    try {
      const fp = resolveAttachmentPath(att);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch { /* ignore fs errors */ }
  });

  tasks.splice(index, 1);
  writeData('tasks', tasks);

  res.json({ message: 'Task deleted successfully' });
});

// ─── GET /api/tasks/:id/attachments/:attachmentId/download ───────────────────
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
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });

  res.download(filePath, attachment.originalName);
});

// ─── GET /api/tasks/:id/download-all ─────────────────────────────────────────
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
  archive.on('error', (err: any) => res.status(500).send({ error: err.message }));
  archive.pipe(res);

  task.attachments.forEach((attachment: any) => {
    const filePath = resolveAttachmentPath(attachment);
    if (fs.existsSync(filePath)) archive.file(filePath, { name: attachment.originalName });
  });

  archive.finalize();
});

export default router;
