import { Router } from 'express';
import { readData, writeData } from '../utils/fileData';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// ─── Notification helper ──────────────────────────────────────────────────────
const addNotification = (userId: string, title: string, message: string, type: string) => {
  const notifications = readData<any>('notifications');
  notifications.push({
    id: uuidv4(), userId, title, message, type, isRead: false,
    createdAt: new Date().toISOString()
  });
  writeData('notifications', notifications);
};

// ─── GET /approvals — pending approvals for the authenticated user ────────────
//
// Matching logic (in priority order):
//   1. Exact match: task.currentApproverId === user.userId   ← preferred for new tasks
//   2. Role match:  task.currentApproverRole === user.role   ← backward compat for legacy tasks
//      (legacy tasks only have currentApproverRole, not currentApproverId)
//
// Additional HOD department guard is removed because currentApproverId already
// uniquely identifies the correct HOD — no name-string comparison needed.
//
router.get('/', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');

  // Include tasks that are in a pending state (PENDING_APPROVAL or legacy SUBMITTED)
  const pending = tasks.filter((t: any) => {
    const isPending =
      t.status === 'PENDING_APPROVAL' ||
      t.status === 'SUBMITTED'; // legacy status for old data

    if (!isPending) return false;

    // Exact approver match (new routing)
    if (t.currentApproverId && t.currentApproverId === user.userId) return true;

    // Role-only match for legacy tasks that lack currentApproverId
    if (!t.currentApproverId && t.currentApproverRole === user.role) {
      // For HOD legacy tasks: also apply department guard to avoid cross-dept leak
      if (user.role === 'HOD') {
        const allUsers = readData<any>('users');
        const creator = allUsers.find((u: any) => u.id === t.createdBy.userId);
        return creator && creator.department === user.department;
      }
      return true;
    }

    return false;
  });

  console.log(`[Approvals GET] userId=${user.userId} role=${user.role} → found ${pending.length} pending task(s)`);

  res.json(pending);
});

// ─── POST /approvals/:id/approve ─────────────────────────────────────────────
router.post('/:id/approve', (req, res) => {
  const user = (req as any).user!;
  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  // Verify task is actually pending
  if (task.status !== 'PENDING_APPROVAL' && task.status !== 'SUBMITTED') {
    return res.status(400).json({ message: 'Task is no longer pending approval' });
  }

  // Authorization: must be the exact designated approver
  //   New tasks: check currentApproverId
  //   Legacy tasks: fall back to role check
  const isExactApprover = task.currentApproverId && task.currentApproverId === user.userId;
  const isRoleApprover  = !task.currentApproverId && task.currentApproverRole === user.role;

  if (!isExactApprover && !isRoleApprover) {
    console.warn(`[Approve] UNAUTHORIZED: userId=${user.userId} role=${user.role} tried to approve task ${task.id}` +
      ` | currentApproverId=${task.currentApproverId} currentApproverRole=${task.currentApproverRole}`);
    return res.status(403).json({ message: 'Unauthorized approval action: this task is not assigned to you' });
  }

  // ── For now: approving sets task to APPROVED (final state) ─────────────────
  // When the approval chain is extended (e.g. HOD → Dean), add next-level
  // routing here by checking the task's taskType against approvalRules for a
  // "nextApprovalLevel" field. For the currently configured task types,
  // HOD is the terminal approver → APPROVED.
  task.status = 'APPROVED';
  task.currentApproverRole = null;
  task.currentApproverId = null;
  task.updatedAt = new Date().toISOString();

  task.timeline.push({
    action: 'APPROVED',
    actorId: user.userId,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString()
  });

  tasks[index] = task;
  writeData('tasks', tasks);

  console.log(`[Approve] taskId=${task.id} approved by userId=${user.userId} role=${user.role}`);

  // Notify the task creator and assignee
  addNotification(
    task.createdBy.userId,
    'Task Approved',
    `Your task "${task.title}" has been approved by ${user.name} (${user.role}).`,
    'Task Approved'
  );
  if (task.assignedTo && task.assignedTo.userId !== task.createdBy.userId) {
    addNotification(
      task.assignedTo.userId,
      'Task Approved',
      `The task "${task.title}" you submitted was approved by ${user.name} (${user.role}).`,
      'Task Approved'
    );
  }

  res.json(task);
});

// ─── POST /approvals/:id/reject ───────────────────────────────────────────────
router.post('/:id/reject', (req, res) => {
  const user = (req as any).user!;
  const { reason } = req.body;

  if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  if (task.status !== 'PENDING_APPROVAL' && task.status !== 'SUBMITTED') {
    return res.status(400).json({ message: 'Task is no longer pending approval' });
  }

  const isExactApprover = task.currentApproverId && task.currentApproverId === user.userId;
  const isRoleApprover  = !task.currentApproverId && task.currentApproverRole === user.role;

  if (!isExactApprover && !isRoleApprover) {
    console.warn(`[Reject] UNAUTHORIZED: userId=${user.userId} tried to reject task ${task.id}`);
    return res.status(403).json({ message: 'Unauthorized approval action: this task is not assigned to you' });
  }

  task.status = 'REJECTED';
  task.currentApproverRole = null;
  task.currentApproverId = null;
  task.updatedAt = new Date().toISOString();

  task.timeline.push({
    action: 'REJECTED',
    reason,
    actorId: user.userId,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString()
  });

  tasks[index] = task;
  writeData('tasks', tasks);

  console.log(`[Reject] taskId=${task.id} rejected by userId=${user.userId} role=${user.role} reason="${reason}"`);

  addNotification(
    task.createdBy.userId,
    'Task Rejected',
    `Your task "${task.title}" was rejected by ${user.name} (${user.role}). Reason: ${reason}`,
    'Task Rejected'
  );
  if (task.assignedTo && task.assignedTo.userId !== task.createdBy.userId) {
    addNotification(
      task.assignedTo.userId,
      'Task Rejected',
      `The task "${task.title}" was rejected. Reason: ${reason}`,
      'Task Rejected'
    );
  }

  res.json(task);
});

// ─── POST /approvals/:id/changes — request changes (returns to staff) ─────────
router.post('/:id/changes', (req, res) => {
  const user = (req as any).user!;
  const { comment } = req.body;

  if (!comment) return res.status(400).json({ message: 'Comment is required' });

  const tasks = readData<any>('tasks');
  const index = tasks.findIndex((t: any) => t.id === req.params.id);

  if (index === -1) return res.status(404).json({ message: 'Task not found' });

  const task = tasks[index];

  if (task.status !== 'PENDING_APPROVAL' && task.status !== 'SUBMITTED') {
    return res.status(400).json({ message: 'Task is no longer pending approval' });
  }

  const isExactApprover = task.currentApproverId && task.currentApproverId === user.userId;
  const isRoleApprover  = !task.currentApproverId && task.currentApproverRole === user.role;

  if (!isExactApprover && !isRoleApprover) {
    return res.status(403).json({ message: 'Unauthorized approval action: this task is not assigned to you' });
  }

  // Store who was the approver so that on resubmit we can re-route correctly
  const previousApproverId = task.currentApproverId;
  const previousApproverRole = task.currentApproverRole;

  task.status = 'CHANGES_REQUESTED';
  // Keep currentApproverId/Role so staff knows where it will go back on resubmit
  task.updatedAt = new Date().toISOString();

  task.timeline.push({
    action: 'CHANGES_REQUESTED',
    reason: comment,
    actorId: user.userId,
    actorName: user.name,
    actorRole: user.role,
    timestamp: new Date().toISOString()
  });

  tasks[index] = task;
  writeData('tasks', tasks);

  addNotification(
    task.createdBy.userId,
    'Changes Requested',
    `Changes requested for task "${task.title}" by ${user.name}. Comment: ${comment}`,
    'Changes Requested'
  );
  if (task.assignedTo && task.assignedTo.userId !== task.createdBy.userId) {
    addNotification(
      task.assignedTo.userId,
      'Changes Requested',
      `Changes requested for task "${task.title}". Comment: ${comment}`,
      'Changes Requested'
    );
  }

  res.json(task);
});

export default router;
