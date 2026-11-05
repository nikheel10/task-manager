import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission, canManageUsers } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { userUpdateSchema as updateUserSchema } from '@/lib/validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(canManageUsers);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, role, isActive, password, departmentId } = parsed.data;

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent demoting/deactivating yourself
    if (user.id === id) {
      if (role && role !== userToUpdate.role) {
        return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
      }
      if (isActive === false) {
        return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
      }
    }

    // Check if deactivating or changing department of a user with open tasks/alerts
    if (isActive === false || (departmentId !== undefined && departmentId !== userToUpdate.departmentId)) {
      const [openTasks, openAlerts] = await Promise.all([
        prisma.task.count({ where: { assigneeId: id, deletedAt: null, status: { notIn: ['CLOSED', 'COMPLETED'] } } }),
        prisma.alert.count({ where: { ownerId: id, deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      ]);

      if (openTasks > 0 || openAlerts > 0) {
        return NextResponse.json(
          {
            error: 'Cannot change user status or department with open work',
            fieldErrors: {
              ...(isActive === false ? { isActive: [`User has ${openTasks} open task(s) and ${openAlerts} open alert(s). Reassign or close them first.`] } : {}),
              ...(departmentId !== undefined ? { departmentId: [`User has ${openTasks} open task(s) and ${openAlerts} open alert(s). Reassign or close them first.`] } : {}),
            },
          },
          { status: 409 }
        );
      }
    }

    // SUPER_ADMIN and MD must have null departmentId
    const resolvedRole = role ?? userToUpdate.role;
    const resolvedDeptId = (resolvedRole === 'SUPER_ADMIN' || resolvedRole === 'MD') ? null : (departmentId ?? userToUpdate.departmentId);

    if ((resolvedRole === 'MANAGER' || resolvedRole === 'TEAM_MEMBER' || resolvedRole === 'VIEWER') && !resolvedDeptId) {
      return NextResponse.json(
        { error: 'Department is required for this role', fieldErrors: { departmentId: ['Department is required'] } },
        { status: 400 }
      );
    }

    // Verify department exists and is active if provided
    if (resolvedDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: resolvedDeptId } });
      if (!dept || !dept.active) {
        return NextResponse.json(
          { error: 'Department not found or inactive', fieldErrors: { departmentId: ['Department not found or inactive'] } },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (departmentId !== undefined) data.departmentId = resolvedDeptId;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true, createdAt: true, isComplianceOwner: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
      }
    }
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(canManageUsers);
    const { id } = await params;

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.id === id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const [openTasks, openAlerts] = await Promise.all([
      prisma.task.count({ where: { assigneeId: id, deletedAt: null, status: { notIn: ['CLOSED', 'COMPLETED'] } } }),
      prisma.alert.count({ where: { ownerId: id, deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    ]);

    if (openTasks > 0 || openAlerts > 0) {
      return NextResponse.json(
        {
          error: 'Cannot deactivate user with open work',
          fieldErrors: { id: [`User has ${openTasks} open task(s) and ${openAlerts} open alert(s). Reassign or close them first.`] },
        },
        { status: 409 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
      }
    }
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
