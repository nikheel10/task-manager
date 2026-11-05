import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const updateTeamMemberSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  email: z.string().email().optional(),
  role: z.enum(['TEAM_MEMBER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    if (user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Manager only' }, { status: 403 });
    }

    if (!user.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Manager can only manage users in their own department
    if (userToUpdate.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Forbidden: Can only manage users in your department' }, { status: 403 });
    }

    // Only TEAM_MEMBER and VIEWER roles
    if (userToUpdate.role !== 'TEAM_MEMBER' && userToUpdate.role !== 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden: Can only manage team members and viewers' }, { status: 403 });
    }

    // Prevent deactivating yourself
    if (user.id === id) {
      if (parsed.data.isActive === false) {
        return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
      }
    }

    // Check if deactivating a user with open tasks/alerts
    if (parsed.data.isActive === false) {
      const [openTasks, openAlerts] = await Promise.all([
        prisma.task.count({ where: { assigneeId: id, deletedAt: null, status: { notIn: ['CLOSED', 'COMPLETED'] } } }),
        prisma.alert.count({ where: { ownerId: id, deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      ]);

      if (openTasks > 0 || openAlerts > 0) {
        return NextResponse.json(
          {
            error: 'Cannot deactivate user with open work',
            fieldErrors: { isActive: [`User has ${openTasks} open task(s) and ${openAlerts} open alert(s). Reassign or close them first.`] },
          },
          { status: 409 }
        );
      }
    }

    const { name, email, role, isActive, password } = parsed.data;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email.toLowerCase();
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true, createdAt: true, employeeId: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager only' }, { status: 403 });
      }
    }
    console.error('PATCH /api/team-members/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    if (user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Manager only' }, { status: 403 });
    }

    if (!user.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
    }

    const { id } = await params;

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userToDelete.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Forbidden: Can only manage users in your department' }, { status: 403 });
    }

    if (user.id === id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    if (userToDelete.role !== 'TEAM_MEMBER' && userToDelete.role !== 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden: Can only manage team members and viewers' }, { status: 403 });
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
        return NextResponse.json({ error: 'Forbidden: Manager only' }, { status: 403 });
      }
    }
    console.error('DELETE /api/team-members/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
