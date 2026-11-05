import { User, Role as PrismaRole, Department } from '@prisma/client';

export type Role = 'SUPER_ADMIN' | 'MD' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  departmentId: string | null;
  status: string;
  isActive: boolean;
  isComplianceOwner: boolean;
  departmentHasGlobalAccess: boolean;
}

export interface DepartmentWithGlobalAccess {
  id: string;
  name: string;
  code: string;
  active: boolean;
  hasGlobalAccess: boolean;
}

export function isGlobalViewer(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'MD' || user.departmentHasGlobalAccess === true;
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

export function viewScopeWhere(
  user: AuthUser,
  requestedDepartmentId?: string | null
): Record<string, unknown> {
  if (isGlobalViewer(user)) {
    if (requestedDepartmentId) {
      return { departmentId: requestedDepartmentId };
    }
    return {};
  }

  if (user.role === 'TEAM_MEMBER') {
    return { assigneeId: user.id };
  }

  return { departmentId: user.departmentId };
}

export function taskViewScopeWhere(
  user: AuthUser,
  requestedDepartmentId?: string | null
): Record<string, unknown> {
  if (isGlobalViewer(user)) {
    if (requestedDepartmentId) {
      return { departmentId: requestedDepartmentId };
    }
    return {};
  }

  if (user.role === 'TEAM_MEMBER') {
    return { assigneeId: user.id };
  }

  if (user.role === 'MANAGER') {
    return {
      OR: [
        { departmentId: user.departmentId },
        { originDepartmentId: user.departmentId },
      ],
    };
  }

  return { departmentId: user.departmentId };
}

export function writeScopeWhere(user: AuthUser): Record<string, unknown> {
  if (user.role === 'SUPER_ADMIN') {
    return {};
  }

  if (user.role === 'MD') {
    return { id: 'none' };
  }

  if (user.role === 'MANAGER' || user.role === 'TEAM_MEMBER') {
    return { departmentId: user.departmentId };
  }

  return { id: 'none' };
}

export function taskScopeWhere(user: AuthUser, requestedDepartmentId?: string | null): Record<string, unknown> {
  return taskViewScopeWhere(user, requestedDepartmentId);
}

export function alertScopeWhere(user: AuthUser, requestedDepartmentId?: string | null): Record<string, unknown> {
  if (isGlobalViewer(user)) {
    if (requestedDepartmentId) {
      return { departmentId: requestedDepartmentId };
    }
    return {};
  }

  return { departmentId: user.departmentId };
}

export function userScopeWhere(user: AuthUser): Record<string, unknown> {
  if (user.role === 'SUPER_ADMIN') {
    return {};
  }
  if (user.role === 'MD') {
    return {};
  }
  if (user.role === 'MANAGER') {
    return { departmentId: user.departmentId };
  }
  return { id: user.id };
}

export function canWrite(user: AuthUser): boolean {
  if (user.role === 'VIEWER') return false;
  if (user.role === 'MD') return false;
  return true;
}

export function canViewTask(user: AuthUser, task: { departmentId: string | null; originDepartmentId: string | null; assigneeId: string; creatorId: string }): boolean {
  if (isGlobalViewer(user)) return true;
  if (user.role === 'MANAGER') {
    return task.departmentId === user.departmentId || task.originDepartmentId === user.departmentId;
  }
  if (user.role === 'TEAM_MEMBER') {
    return task.assigneeId === user.id || task.creatorId === user.id;
  }
  if (user.role === 'VIEWER') {
    return task.departmentId === user.departmentId;
  }
  return false;
}

export function canEditTask(user: AuthUser, task: { departmentId: string | null; originDepartmentId: string | null; assigneeId: string }): boolean {
  if (isGlobalViewer(user)) return true;
  if (user.role === 'MANAGER') {
    return task.departmentId === user.departmentId || task.originDepartmentId === user.departmentId;
  }
  if (user.role === 'TEAM_MEMBER') {
    return task.assigneeId === user.id;
  }
  return false;
}

export function canAssign(user: AuthUser, targetUser: AuthUser, task?: { departmentId: string | null; originDepartmentId: string | null }): boolean {
  if (!targetUser.isActive) return false;
  if (!['TEAM_MEMBER', 'MANAGER'].includes(targetUser.role)) return false;

  if (user.role === 'SUPER_ADMIN') {
    return targetUser.role === 'MANAGER' || targetUser.role === 'TEAM_MEMBER';
  }

  if (user.role === 'MD') {
    return targetUser.role === 'MANAGER';
  }

  if (user.role === 'MANAGER') {
    // Can assign to TEAM_MEMBERs of own department only
    if (targetUser.role === 'TEAM_MEMBER') {
      return targetUser.departmentId === user.departmentId;
    }
    // Can assign to MANAGERs of OTHER departments only (cross-department)
    if (targetUser.role === 'MANAGER') {
      return targetUser.departmentId !== user.departmentId;
    }
    return false;
  }

  return false;
}

export function canVerify(user: AuthUser): boolean {
  return isGlobalViewer(user) || user.role === 'MANAGER';
}

export function canDeleteTask(user: AuthUser): boolean {
  if (user.role === 'MD') return false;
  return isGlobalViewer(user) || user.role === 'MANAGER';
}

export function canManageUsers(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

export function canManageDepartments(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

export function canManageSettings(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

export function canApproveRegistration(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'MD' || user.role === 'MANAGER';
}

export function canDeleteAlerts(user: AuthUser): boolean {
  if (user.role === 'MD') return false;
  return isGlobalViewer(user) || user.role === 'MANAGER';
}

export function canViewAlert(user: AuthUser, alert: { departmentId: string | null; ownerId: string; createdById: string }): boolean {
  if (isGlobalViewer(user)) return true;
  if (user.role === 'MANAGER') {
    return alert.departmentId === user.departmentId;
  }
  if (user.role === 'TEAM_MEMBER') {
    return alert.ownerId === user.id || alert.createdById === user.id;
  }
  if (user.role === 'VIEWER') {
    return alert.departmentId === user.departmentId;
  }
  return false;
}

export function canEditAlert(user: AuthUser, alert: { departmentId: string | null; ownerId: string }): boolean {
  if (isGlobalViewer(user)) return true;
  if (user.role === 'MANAGER') {
    return alert.departmentId === user.departmentId;
  }
  if (user.role === 'TEAM_MEMBER') {
    return alert.ownerId === user.id;
  }
  return false;
}

export function canViewProject(user: AuthUser, project: { departmentId: string | null }): boolean {
  if (isGlobalViewer(user)) return true;
  return project.departmentId === user.departmentId;
}

export function canViewUser(user: AuthUser, targetUser: AuthUser): boolean {
  if (isGlobalViewer(user)) return true;
  if (user.role === 'MANAGER') {
    return targetUser.departmentId === user.departmentId || targetUser.role === 'MANAGER';
  }
  return user.id === targetUser.id;
}

export function canManageDepartmentFlag(user: AuthUser): boolean {
  return user.role === 'SUPER_ADMIN';
}

export const isGlobalRole = isGlobalViewer;

export function projectScopeWhere(user: AuthUser, requestedDepartmentId?: string | null): Record<string, unknown> {
  if (isGlobalViewer(user)) {
    if (requestedDepartmentId) {
      return { departmentId: requestedDepartmentId };
    }
    return {};
  }
  return { departmentId: user.departmentId };
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 5,
  MD: 4,
  MANAGER: 3,
  TEAM_MEMBER: 2,
  VIEWER: 1,
};

export function hasMinRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
