export const ALERT_NUMBER_PREFIX = 'ALT';

export const UPCOMING_DEADLINE_DAYS = 7;

export const ALERT_ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'OVERDUE', 'CANCELLED'],
  IN_PROGRESS: ['SUBMITTED', 'OVERDUE', 'CANCELLED'],
  SUBMITTED: ['COMPLETED', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const DEFAULT_REMINDER_DAYS = [90, 60, 30];

export interface DefaultReminderRule {
  daysBefore: number;
  isActive: boolean;
}

export const DEFAULT_REMINDER_RULES: DefaultReminderRule[] = [
  { daysBefore: 90, isActive: true },
  { daysBefore: 60, isActive: true },
  { daysBefore: 30, isActive: true },
];

export interface DefaultEscalationRule {
  afterDaysOverdue: number;
  escalateToRole: string | null;
  isActive: boolean;
}

export const DEFAULT_ESCALATION_RULES: DefaultEscalationRule[] = [
  { afterDaysOverdue: 3, escalateToRole: 'MANAGER', isActive: true },
  { afterDaysOverdue: 7, escalateToRole: 'SUPER_ADMIN', isActive: true },
];

export const ALLOWED_EVIDENCE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; // 10 MB

export const REQUIRE_EVIDENCE_ON_COMPLETE = false;

export function formatAlertNumber(alertNumber: number): string {
  return `${ALERT_NUMBER_PREFIX}-${String(alertNumber).padStart(4, '0')}`;
}

export function parseAlertNumber(input: string): number | null {
  const match = input.match(/^ALT[-]?(\d+)$/i);
  if (match) return parseInt(match[1], 10);
  const numMatch = input.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

export function canTransitionAlertStatus(fromStatus: string, toStatus: string): boolean {
  const allowed = ALERT_ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

export function validateAlertStatusTransition(fromStatus: string, toStatus: string): { valid: boolean; error?: string } {
  if (fromStatus === toStatus) return { valid: true };
  const allowed = ALERT_ALLOWED_STATUS_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    return {
      valid: false,
      error: `Invalid alert status transition from ${fromStatus} to ${toStatus}. Allowed: ${allowed.join(', ')}`,
    };
  }
  return { valid: true };
}

export function isAlertOverdue(dueDate: Date | string, status: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today && !['COMPLETED', 'CANCELLED'].includes(status);
}

export function calculateNextDueDate(dueDate: Date, recurrence: string, intervalDays?: number): Date | null {
  if (recurrence === 'ONE_TIME') return null;
  
  const next = new Date(dueDate);
  
  switch (recurrence) {
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'ANNUAL':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'CUSTOM':
      if (intervalDays) {
        next.setDate(next.getDate() + intervalDays);
      } else {
        return null;
      }
      break;
    default:
      return null;
  }
  
  return next;
}