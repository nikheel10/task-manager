export const TASK_REQUIRED_FIELDS = ['title', 'assigneeId', 'priority', 'dueDate'] as const;

export const ELIGIBLE_ASSIGNEE_ROLES = ['TEAM_MEMBER', 'MANAGER'] as const;

export const COMMENT_ORDER = 'newest-first' as const;

export const UPCOMING_DEADLINE_DAYS = 7;

export const TASK_NUMBER_PREFIX = 'TSK';

// Status transition rules: from -> allowed next statuses
export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['BLOCKED', 'COMPLETED'],
  BLOCKED: ['IN_PROGRESS'],
  COMPLETED: ['CLOSED', 'IN_PROGRESS'], // CLOSED = manager verify, IN_PROGRESS = reject
  CLOSED: [], // Terminal state
};

export function formatTaskNumber(taskNumber: number): string {
  return `${TASK_NUMBER_PREFIX}-${String(taskNumber).padStart(4, '0')}`;
}

export function parseTaskNumber(input: string): number | null {
  const match = input.match(/^TSK[-]?(\d+)$/i);
  if (match) return parseInt(match[1], 10);
  const numMatch = input.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

export function isOverdue(dueDate: Date | string, status: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today && !['COMPLETED', 'CLOSED'].includes(status);
}

export function isUpcoming(dueDate: Date | string, status: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = new Date(today);
  upcoming.setDate(upcoming.getDate() + UPCOMING_DEADLINE_DAYS);
  return due >= today && due <= upcoming && !['COMPLETED', 'CLOSED'].includes(status);
}

export function canTransitionStatus(fromStatus: string, toStatus: string): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export function validateStatusTransition(fromStatus: string, toStatus: string): { valid: boolean; error?: string } {
  if (fromStatus === toStatus) return { valid: true };
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from ${fromStatus} to ${toStatus}. Allowed: ${allowed.join(', ')}`,
    };
  }
  return { valid: true };
}