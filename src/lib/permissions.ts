export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

export type Action =
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'tasks.reassign'
  | 'tasks.verify'
  | 'tasks.comment'
  | 'tasks.attach'
  | 'tasks.status_change'
  | 'alerts.view'
  | 'alerts.create'
  | 'alerts.edit'
  | 'alerts.delete'
  | 'alerts.complete'
  | 'alerts.reassign'
  | 'alerts.comment'
  | 'alerts.evidence'
  | 'alerts.status_change'
  | 'entities.view'
  | 'entities.create'
  | 'entities.edit'
  | 'entities.delete'
  | 'admin.users'
  | 'admin.config'
  | 'admin.audit'
  | 'admin.automation'
  | 'reports.view'
  | 'settings.view'
  | 'settings.edit_profile'
  | 'settings.change_password';

interface PermissionRule {
  roles: Role[];
  /** If true, the user must be the owner/assignee/creator of the resource */
  ownOnly?: boolean;
}

export const PERMISSION_MATRIX: Record<Action, PermissionRule> = {
  // Tasks
  'tasks.view': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  'tasks.create': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'tasks.edit': { roles: ['SUPER_ADMIN', 'MANAGER'], ownOnly: false },
  'tasks.delete': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'tasks.reassign': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'tasks.verify': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'tasks.comment': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER'], ownOnly: true },
  'tasks.attach': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER'], ownOnly: true },
  'tasks.status_change': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER'], ownOnly: true },

  // Alerts
  'alerts.view': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  'alerts.create': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'alerts.edit': { roles: ['SUPER_ADMIN', 'MANAGER'], ownOnly: false },
  'alerts.delete': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'alerts.complete': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER'], ownOnly: true },
  'alerts.reassign': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'alerts.comment': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER'], ownOnly: true },
  'alerts.evidence': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER'], ownOnly: true },
  'alerts.status_change': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER'], ownOnly: true },

  // Entities
  'entities.view': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  'entities.create': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'entities.edit': { roles: ['SUPER_ADMIN', 'MANAGER'] },
  'entities.delete': { roles: ['SUPER_ADMIN', 'MANAGER'] },

  // Admin
  'admin.users': { roles: ['SUPER_ADMIN'] },
  'admin.config': { roles: ['SUPER_ADMIN'] },
  'admin.audit': { roles: ['SUPER_ADMIN'] },
  'admin.automation': { roles: ['SUPER_ADMIN'] },

  // Reports
  'reports.view': { roles: ['SUPER_ADMIN', 'MANAGER'] },

  // Settings
  'settings.view': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  'settings.edit_profile': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
  'settings.change_password': { roles: ['SUPER_ADMIN', 'MANAGER', 'TEAM_MEMBER', 'VIEWER'] },
};

const roleHierarchy: Record<Role, number> = {
  SUPER_ADMIN: 4,
  MANAGER: 3,
  TEAM_MEMBER: 2,
  VIEWER: 1,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function hasPermission(userRole: Role, action: Action): boolean {
  const rule = PERMISSION_MATRIX[action];
  if (!rule) return false;
  return rule.roles.includes(userRole);
}

export function hasPermissionWithOwner(
  userRole: Role,
  userId: string,
  action: Action,
  ownerId?: string | null,
  creatorId?: string | null,
): boolean {
  if (!hasPermission(userRole, action)) return false;

  const rule = PERMISSION_MATRIX[action];
  if (!rule?.ownOnly) return true;

  // ownOnly: user must be owner or creator
  return userId === ownerId || userId === creatorId;
}

export function canAccessTask(
  userRole: Role,
  userId: string,
  taskAssigneeId: string,
  taskCreatorId: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === taskAssigneeId || userId === taskCreatorId;
  if (userRole === 'VIEWER') return true;
  return false;
}

export function canModifyTask(
  userRole: Role,
  userId: string,
  taskAssigneeId: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === taskAssigneeId;
  return false;
}

export function canCommentOnTask(
  userRole: Role,
  userId: string,
  taskAssigneeId: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === taskAssigneeId;
  return false;
}

export function canEditComment(
  userRole: Role,
  userId: string,
  commentAuthorId: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  return userId === commentAuthorId;
}

export function canDeleteComment(
  userRole: Role,
  userId: string,
  commentAuthorId: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  return userId === commentAuthorId;
}

export function canAccessAlert(
  userRole: Role,
  userId: string,
  alertOwnerId: string,
  alertCreatedById: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === alertOwnerId || userId === alertCreatedById;
  if (userRole === 'VIEWER') return userId === alertOwnerId;
  return false;
}

export function canModifyAlert(
  userRole: Role,
  userId: string,
  alertOwnerId: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === alertOwnerId;
  return false;
}

export function canCommentOnAlert(
  userRole: Role,
  userId: string,
  alertOwnerId: string,
): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === alertOwnerId;
  return false;
}
