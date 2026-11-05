import { z } from 'zod';

// Common patterns
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// ===== Department Validators =====

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long'),
  code: z.string().trim().toUpperCase().min(2, 'Code must be at least 2 characters').max(10, 'Code too long').regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only'),
});

export const departmentUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long').optional(),
  code: z.string().trim().toUpperCase().min(2, 'Code must be at least 2 characters').max(10, 'Code too long').regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only').optional(),
  active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

// ===== Task Validators =====

export const taskCreateSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  description: z.string().trim().max(500, 'Description too long').optional().nullable(),
  assigneeId: z.string().cuid('Invalid assignee'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueDate: z.string().datetime({ offset: true }).refine((date) => {
    const due = new Date(date);
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return due.getTime() >= todayUtc;
  }, 'Due date cannot be in the past'),
  type: z.enum(['TASK', 'BUG', 'FEATURE', 'MAINTENANCE', 'COMPLIANCE']).default('TASK'),
  categoryId: z.string().min(1).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  milestoneId: z.string().min(1).optional().nullable(),
  estimatedHours: z.number().min(0, 'Estimated hours must be >= 0').max(10000).optional().nullable(),
  progress: z.number().int().min(0, 'Progress must be 0-100').max(100, 'Progress must be 0-100').optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  assigneeId: z.string().cuid('Invalid assignee').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CLOSED']).optional(),
  type: z.enum(['TASK', 'BUG', 'FEATURE', 'MAINTENANCE', 'COMPLIANCE']).optional(),
  categoryId: z.string().min(1).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  milestoneId: z.string().min(1).optional().nullable(),
  estimatedHours: z.number().min(0).max(10000).optional().nullable(),
  actualHours: z.number().min(0).max(10000).optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  blockedReason: z.string().trim().max(1000).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided')
  .refine((data) => {
    if (data.status === 'BLOCKED' && !data.blockedReason) {
      return false;
    }
    return true;
  }, {
    message: 'Blocked reason is required when status is BLOCKED',
    path: ['blockedReason'],
  });

// ===== Comment Validators =====

export const commentCreateSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(300, 'Comment too long'),
});

export const commentUpdateSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(300, 'Comment too long'),
});

// ===== Checklist Validators =====

export const checklistCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  completed: z.boolean().default(false),
  doneAt: z.string().datetime({ offset: true }).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isMandatory: z.boolean().default(true),
});

export const checklistUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  doneAt: z.string().datetime({ offset: true }).optional().nullable(),
  order: z.number().int().min(0).optional(),
  isMandatory: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

// ===== Alert Validators =====

export const alertCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  reference: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.enum(['REGULATORY', 'STATUTORY', 'LICENSE_RENEWAL', 'CONTRACT_RENEWAL', 'INSURANCE', 'INSPECTION', 'COMPLIANCE_FILING']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  entityId: z.string().min(1).optional().nullable(),
  ownerId: z.string().cuid('Invalid owner'),
  regulatoryClause: z.string().trim().max(300, 'Regulatory clause too long').optional().nullable(),
  triggerDate: z.string().datetime({ offset: true }),
  dueDate: z.string().datetime({ offset: true }),
  recurrence: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']),
  recurrenceIntervalDays: z.number().int().positive().optional().nullable(),
  recurrenceEndDate: z.string().datetime({ offset: true }).optional().nullable(),
  reminderDays: z.array(z.number().int().positive()).optional(),
  escalationDays: z.number().int().positive().optional(),
  customIntervalDays: z.number().int().positive().optional(),
}).refine((data) => {
  const trigger = new Date(data.triggerDate);
  const due = new Date(data.dueDate);
  return due >= trigger;
}, {
  message: 'Due date must be on or after trigger date',
  path: ['dueDate'],
}).refine((data) => {
  if (data.recurrence === 'CUSTOM' && !data.customIntervalDays) {
    return false;
  }
  return true;
}, {
  message: 'Custom interval days is required for CUSTOM recurrence',
  path: ['customIntervalDays'],
}).refine((data) => {
  if (data.reminderDays && data.reminderDays.length !== new Set(data.reminderDays).size) {
    return false;
  }
  return true;
}, {
  message: 'Reminder days must be unique',
  path: ['reminderDays'],
});

export const alertUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  reference: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.enum(['REGULATORY', 'STATUTORY', 'LICENSE_RENEWAL', 'CONTRACT_RENEWAL', 'INSURANCE', 'INSPECTION', 'COMPLIANCE_FILING']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  entityId: z.string().min(1).optional().nullable(),
  ownerId: z.string().cuid('Invalid owner').optional(),
  regulatoryClause: z.string().trim().max(300).optional().nullable(),
  triggerDate: z.string().datetime({ offset: true }).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  recurrence: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']).optional(),
  recurrenceIntervalDays: z.number().int().positive().optional().nullable(),
  recurrenceEndDate: z.string().datetime({ offset: true }).optional().nullable(),
  reminderDays: z.array(z.number().int().positive()).optional(),
  escalationDays: z.number().int().positive().optional(),
  customIntervalDays: z.number().int().positive().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided')
  .refine((data) => {
    if (data.dueDate && data.triggerDate) {
      const trigger = new Date(data.triggerDate);
      const due = new Date(data.dueDate);
      return due >= trigger;
    }
    return true;
  }, {
    message: 'Due date must be on or after trigger date',
    path: ['dueDate'],
  });

// ===== User Validators =====

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  role: z.enum(['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER', 'VIEWER']),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(passwordPattern, 'Password must contain uppercase, lowercase, number, and special character'),
  departmentId: z.string().nullable().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).regex(passwordPattern, 'Password must contain uppercase, lowercase, number, and special character').optional(),
  departmentId: z.string().nullable().optional(),
});

// ===== Re-export query schemas from task validators =====

export { taskQuerySchema, alertQuerySchema } from '@/lib/validators/task';

// ===== Login Validator =====

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
