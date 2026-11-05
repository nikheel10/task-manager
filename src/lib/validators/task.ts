import { z } from 'zod';

export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const taskStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CLOSED']);
export const taskTypeSchema = z.enum(['TASK', 'BUG', 'FEATURE', 'MAINTENANCE', 'COMPLIANCE']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task name is required').max(200, 'Task name too long'),
  description: z.string().trim().max(5000).optional().nullable(),
  assigneeId: z.string().cuid('Invalid assignee'),
  priority: taskPrioritySchema,
  dueDate: z.string().datetime({ offset: true }).refine((date) => {
    const due = new Date(date);
    const now = new Date();
    const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return due.getTime() >= todayUtc;
  }, 'Due date cannot be in the past'),
  type: taskTypeSchema.default('TASK'),
  categoryId: z.string().min(1).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  milestoneId: z.string().min(1).optional().nullable(),
  estimatedHours: z.number().positive().max(10000).optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task name is required').max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  assigneeId: z.string().cuid('Invalid assignee').optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  status: taskStatusSchema.optional(),
  type: taskTypeSchema.optional(),
  categoryId: z.string().min(1).optional().nullable(),
  projectId: z.string().min(1).optional().nullable(),
  milestoneId: z.string().min(1).optional().nullable(),
  estimatedHours: z.number().positive().max(10000).optional().nullable(),
  actualHours: z.number().min(0).max(10000).optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  blockedReason: z.string().trim().max(1000).optional().nullable(),
  blockedAt: z.string().datetime({ offset: true }).optional().nullable(),
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

export const taskQuerySchema = z.object({
  search: z.string().optional(),
  assigneeId: z.string().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  categoryId: z.string().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  departmentId: z.string().optional(),
  overdueOnly: z.coerce.boolean().optional(),
  upcomingOnly: z.coerce.boolean().optional(),
  unassigned: z.coerce.boolean().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const verificationSchema = z.object({
  outcome: z.enum(['VERIFIED', 'REJECTED']),
  reason: z.string().trim().max(5000).optional(),
}).refine((data) => data.outcome !== 'REJECTED' || (data.reason && data.reason.length > 0), {
  message: 'Reason is required when rejecting',
  path: ['reason'],
});

export const checklistItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  completed: z.boolean().default(false),
  doneAt: z.string().datetime({ offset: true }).optional().nullable(),
  order: z.number().int().min(0).default(0),
  isMandatory: z.boolean().default(true),
});

export const updateChecklistItemSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  doneAt: z.string().datetime({ offset: true }).optional().nullable(),
  order: z.number().int().min(0).optional(),
  isMandatory: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export const taskCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  code: z.string().trim().toUpperCase().min(2).max(10).optional().nullable(),
  departmentId: z.string().min(1, 'Department is required'),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const milestoneSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phaseName: z.string().trim().max(100).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  projectId: z.string().cuid('Invalid project'),
});

export const updateMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phaseName: z.string().trim().max(100).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

// AMC Validators

export const alertTypeSchema = z.enum(['REGULATORY', 'STATUTORY', 'LICENSE_RENEWAL', 'CONTRACT_RENEWAL', 'INSURANCE', 'INSPECTION', 'COMPLIANCE_FILING']);
export const alertStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'OVERDUE', 'CANCELLED']);
export const recurrenceSchema = z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']);
export const entityTypeSchema = z.enum(['PROJECT', 'ASSET', 'COMPANY', 'SITE', 'OTHER']);

export const entitySchema = z.object({
  name: z.string().trim().min(1, 'Entity name is required').max(200),
  type: entityTypeSchema,
  jurisdiction: z.string().trim().max(100).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateEntitySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  type: entityTypeSchema.optional(),
  jurisdiction: z.string().trim().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export const createAlertSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  reference: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  type: alertTypeSchema,
  priority: taskPrioritySchema,
  entityId: z.string().min(1).optional().nullable(),
  ownerId: z.string().cuid('Invalid owner'),
  regulatoryClause: z.string().trim().max(500).optional().nullable(),
  triggerDate: z.string().datetime({ offset: true }),
  dueDate: z.string().datetime({ offset: true }),
  recurrence: recurrenceSchema.default('ONE_TIME'),
  recurrenceIntervalDays: z.number().int().positive().optional().nullable(),
  recurrenceEndDate: z.string().datetime({ offset: true }).optional().nullable(),
}).refine((data) => {
  const trigger = new Date(data.triggerDate);
  const due = new Date(data.dueDate);
  return due >= trigger;
}, {
  message: 'Due date must be on or after trigger date',
  path: ['dueDate'],
});

export const updateAlertSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  reference: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  status: alertStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  entityId: z.string().min(1).optional().nullable(),
  ownerId: z.string().cuid('Invalid owner').optional(),
  regulatoryClause: z.string().trim().max(500).optional().nullable(),
  triggerDate: z.string().datetime({ offset: true }).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  recurrence: recurrenceSchema.optional(),
  recurrenceIntervalDays: z.number().int().positive().optional().nullable(),
  recurrenceEndDate: z.string().datetime({ offset: true }).optional().nullable(),
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

export const alertQuerySchema = z.object({
  search: z.string().optional(),
  type: alertTypeSchema.optional(),
  status: alertStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  ownerId: z.string().optional(),
  entityId: z.string().optional(),
  departmentId: z.string().optional(),
  dueFrom: z.string().datetime({ offset: true }).optional(),
  dueTo: z.string().datetime({ offset: true }).optional(),
  overdue: z.coerce.boolean().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

export const alertCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const updateAlertCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(5000),
});

export const regulatoryTemplateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  type: alertTypeSchema,
  jurisdiction: z.string().trim().max(100).optional().nullable(),
  assetType: z.string().trim().max(100).optional().nullable(),
  regulatoryClause: z.string().trim().max(500).optional().nullable(),
  defaultRecurrence: recurrenceSchema.default('ONE_TIME'),
  defaultLeadDays: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const alertReminderRuleSchema = z.object({
  alertId: z.string().cuid().optional().nullable(),
  daysBefore: z.number().int().positive(),
  isActive: z.boolean().default(true),
});

export const alertEscalationRuleSchema = z.object({
  alertId: z.string().cuid().optional().nullable(),
  afterDaysOverdue: z.number().int().positive(),
  escalateToRole: z.string().max(50).optional().nullable(),
  escalateToUserId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().default(true),
});

// Department schemas
export const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long'),
  code: z.string().trim().toUpperCase().min(2, 'Code must be at least 2 characters').max(10, 'Code too long').regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only'),
  hasGlobalAccess: z.boolean().default(false),
});

export const departmentUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long').optional(),
  code: z.string().trim().toUpperCase().min(2, 'Code must be at least 2 characters').max(10, 'Code too long').regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only').optional(),
  active: z.boolean().optional(),
  hasGlobalAccess: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

// Checklist schema
export const checklistCreateSchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(200),
  mandatory: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  departmentId: z.string().optional(),
});

// Registration action schema
export const registrationActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters').optional(),
});

// Signup schema
export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long').regex(/^[a-zA-Z\s.\-]+$/, 'Name can only contain letters, spaces, dots, and hyphens'),
  employeeId: z.string().trim().min(3, 'Employee ID must be at least 3 characters').max(20, 'Employee ID too long').regex(/^[A-Z0-9\-]+$/, 'Employee ID must be uppercase letters, numbers, and hyphens only'),
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 'Password must contain uppercase, lowercase, number, and special character'),
  confirmPassword: z.string(),
  departmentId: z.string().min(1, 'Department is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// User create/update schema
export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('Invalid email').toLowerCase(),
  employeeId: z.string().trim().min(3, 'Employee ID must be at least 3 characters').max(20, 'Employee ID too long').regex(/^[A-Z0-9\-]+$/, 'Employee ID must be uppercase letters, numbers, and hyphens only'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, 'Password must contain uppercase, lowercase, number, and special character'),
  role: z.enum(['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER', 'VIEWER']),
  departmentId: z.string().nullable().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  email: z.string().email().optional(),
  employeeId: z.string().trim().min(3).max(20).regex(/^[A-Z0-9\-]+$/).optional(),
  role: z.enum(['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  departmentId: z.string().nullable().optional(),
  password: z.string().min(8).optional(),
});

// Alert create/update schemas
export const alertCreateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  reference: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  type: z.enum(['REGULATORY', 'STATUTORY', 'LICENSE_RENEWAL', 'CONTRACT_RENEWAL', 'INSURANCE', 'INSPECTION', 'COMPLIANCE_FILING']),
  priority: taskPrioritySchema,
  entityId: z.string().min(1).optional().nullable(),
  ownerId: z.string().cuid('Invalid owner'),
  regulatoryClause: z.string().trim().max(300).optional().nullable(),
  triggerDate: z.string().datetime({ offset: true }),
  dueDate: z.string().datetime({ offset: true }),
  recurrence: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']).default('ONE_TIME'),
  recurrenceIntervalDays: z.number().int().positive().optional().nullable(),
  recurrenceEndDate: z.string().datetime({ offset: true }).optional().nullable(),
  reminderDays: z.array(z.number().int().positive()).optional(),
  customIntervalDays: z.number().int().positive().optional().nullable(),
  escalationToId: z.string().cuid().optional().nullable(),
}).refine((data) => {
  const trigger = new Date(data.triggerDate);
  const due = new Date(data.dueDate);
  return due >= trigger;
}, {
  message: 'Due date must be on or after trigger date',
  path: ['dueDate'],
});

export const alertUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  reference: z.string().trim().max(100).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
  priority: taskPrioritySchema.optional(),
  entityId: z.string().min(1).optional().nullable(),
  ownerId: z.string().cuid('Invalid owner').optional(),
  regulatoryClause: z.string().trim().max(300).optional().nullable(),
  triggerDate: z.string().datetime({ offset: true }).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  recurrence: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']).optional(),
  recurrenceIntervalDays: z.number().int().positive().optional().nullable(),
  recurrenceEndDate: z.string().datetime({ offset: true }).optional().nullable(),
  reminderDays: z.array(z.number().int().positive()).optional(),
  customIntervalDays: z.number().int().positive().optional().nullable(),
  escalationToId: z.string().cuid().optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');