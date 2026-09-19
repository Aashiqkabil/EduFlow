/**
 * approvalRules.ts
 *
 * Central configuration for task-type → approval routing.
 *
 * HOW TO EXTEND:
 *   - Add a new entry to APPROVAL_RULES with the task type as the key.
 *   - Set approvalLevel to 'HOD', 'Dean', 'Principal', or null (TBD / not yet configured).
 *   - The submit endpoint reads this config to determine the exact approver automatically.
 *   - No code changes are needed anywhere else when adding a new rule.
 */

export type ApprovalLevel = 'HOD' | 'Dean' | 'Principal' | null;

export interface ApprovalRule {
  /** The role that must approve this task type first. null = not yet defined. */
  approvalLevel: ApprovalLevel;
  /** Human-readable explanation for logging / error messages. */
  description: string;
}

/**
 * Task Type → Approval Rule map.
 *
 * TBD entries have approvalLevel: null.
 * When Staff submits a task whose type has no rule, the backend returns
 * a clear error: "No approval rule defined for task type X."
 */
export const APPROVAL_RULES: Record<string, ApprovalRule> = {
  'Attendance Report':         { approvalLevel: 'HOD', description: 'Requires HOD approval' },
  'Performance Report':        { approvalLevel: 'HOD', description: 'Requires HOD approval' },
  'Result Analysis':           { approvalLevel: null,  description: 'Approval chain TBD' },
  'Assignment Submission':     { approvalLevel: null,  description: 'Approval chain TBD' },
  'Internal Assessment':       { approvalLevel: null,  description: 'Approval chain TBD' },
  'Student Feedback Collection': { approvalLevel: null, description: 'Approval chain TBD' },
};

/** Returns the approval rule for a given task type, or null if not registered. */
export const getApprovalRule = (taskType: string): ApprovalRule | null => {
  return APPROVAL_RULES[taskType] ?? null;
};

/** All registered task type names (for frontend dropdown population if needed). */
export const TASK_TYPES = Object.keys(APPROVAL_RULES);
