import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  isGlobalViewer,
  canViewTask,
  canEditTask,
  canAssign,
  canVerify,
  canDeleteTask,
  canManageUsers,
  canManageDepartments,
  canManageSettings,
  canDeleteAlerts,
  canViewAlert,
  canEditAlert,
  canViewProject,
  canViewUser,
  canManageDepartmentFlag,
  canApproveRegistration,
  ROLE_HIERARCHY,
  hasMinRole,
  AuthUser,
  Role,
  viewScopeWhere,
  writeScopeWhere,
  canWrite,
  canManageDepartmentFlag as canManageDeptFlag,
} from '@/lib/access';

export type AppRole = Role;

export const RoleLevel = ROLE_HIERARCHY;

export { hasMinRole } from '@/lib/access';
export { isGlobalViewer, canApproveRegistration, canManageDepartmentFlag as canManageDepartmentsFlag };

export async function getDbUser(sessionUserId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      departmentId: true,
      status: true,
      isActive: true,
      isComplianceOwner: true,
      department: {
        select: {
          hasGlobalAccess: true,
        },
      },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    departmentId: user.departmentId,
    status: user.status,
    isActive: user.isActive,
    isComplianceOwner: user.isComplianceOwner,
    departmentHasGlobalAccess: user.department?.hasGlobalAccess ?? false,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('UNAUTHENTICATED');
  }

  const dbUser = await getDbUser(session.user.id);
  if (!dbUser) {
    throw new Error('UNAUTHENTICATED');
  }
  if (dbUser.status !== 'ACTIVE' || !dbUser.isActive) {
    throw new Error('USER_INACTIVE');
  }

  return dbUser;
}

export async function requireRole(requiredRole: Role): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasMinRole(user.role, requiredRole)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requirePermission(fn: (user: AuthUser) => boolean): Promise<AuthUser> {
  const user = await requireAuth();
  if (!fn(user)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireGlobal(): Promise<AuthUser> {
  const user = await requireAuth();
  if (!isGlobalViewer(user)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function requireWriteAccess(): Promise<AuthUser> {
  const user = await requireAuth();
  if (!canWrite(user)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export function canAccessTask(userRole: Role, userId: string, taskAssigneeId: string, taskCreatorId: string): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === taskAssigneeId || userId === taskCreatorId;
  if (userRole === 'VIEWER') return true;
  return false;
}

export function canModifyTask(userRole: Role, userId: string, taskAssigneeId: string): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === taskAssigneeId;
  return false;
}

export function canCommentOnTask(userRole: Role, userId: string, taskAssigneeId: string): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  if (userRole === 'TEAM_MEMBER') return userId === taskAssigneeId;
  return false;
}

export function canEditComment(userRole: Role, userId: string, commentAuthorId: string): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  return userId === commentAuthorId;
}

export function canDeleteComment(userRole: Role, userId: string, commentAuthorId: string): boolean {
  if (hasMinRole(userRole, 'MANAGER')) return true;
  return userId === commentAuthorId;
}

export { isGlobalViewer as isGlobalRole, canViewTask, canEditTask, canAssign, canVerify, canDeleteTask, canManageUsers, canManageDepartments, canManageSettings, canDeleteAlerts, canViewAlert, canEditAlert, canViewProject, canViewUser, canManageDepartmentFlag, viewScopeWhere, writeScopeWhere, canWrite };
