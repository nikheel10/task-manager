import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/rbac';
import { canViewTask, canEditTask, canDeleteTask, canAssign, canVerify } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { taskUpdateSchema as updateTaskSchema } from '@/lib/validators';
import { formatTaskNumber, validateStatusTransition } from '@/lib/task-rules';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true, email: true } },
        comments: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        checklist: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { order: 'asc' },
        },
        verifications: {
          include: { verifier: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        taskAssignments: {
          include: {
            fromUser: { select: { id: true, name: true, email: true } },
            toUser: { select: { id: true, name: true, email: true } },
            assignedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        department: { select: { id: true, name: true, code: true } },
        originDepartment: { select: { id: true, name: true, code: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canViewTask(user, task)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ ...task, taskNumberDisplay: formatTaskNumber(task.taskNumber) });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('GET /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existingTask = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        checklist: true,
        department: { select: { id: true, name: true } },
        originDepartment: { select: { id: true, name: true } },
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canEditTask(user, existingTask)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = parsed.data;

    // TEAM_MEMBER can only update status, progress, actualHours, blockingReason on own tasks
    if (user.role === 'TEAM_MEMBER') {
      const allowedKeys = ['status', 'percentComplete', 'actualHours', 'blockedReason'];
      const updateKeys = Object.keys(data);
      if (updateKeys.some((k) => !allowedKeys.includes(k))) {
        return NextResponse.json(
          { error: 'Forbidden: Team members can only update status, progress, actual hours, and blocking reason' },
          { status: 403 }
        );
      }
      if (existingTask.assigneeId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot modify task assigned to another user' },
          { status: 403 }
        );
      }
    }

    // Validate status transition
    if (data.status && data.status !== existingTask.status) {
      const transition = validateStatusTransition(existingTask.status, data.status);
      if (!transition.valid) {
        return NextResponse.json(
          { error: transition.error, fieldErrors: { status: [transition.error!] } },
          { status: 400 }
        );
      }

      // Only MANAGER/MD/SUPER_ADMIN can set CLOSED
      if (data.status === 'CLOSED' && !canVerify(user)) {
        return NextResponse.json(
          { error: 'Forbidden: Only managers can close tasks', fieldErrors: { status: ['Only managers can close tasks'] } },
          { status: 403 }
        );
      }

      // TEAM_MEMBER can only move their own tasks
      if (user.role === 'TEAM_MEMBER' && existingTask.assigneeId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot modify task assigned to another user' },
          { status: 403 }
        );
      }
    }

    // Require blockedReason when status = BLOCKED
    if (data.status === 'BLOCKED' && (!data.blockedReason || !data.blockedReason.trim())) {
      return NextResponse.json(
        { error: 'Blocked reason is required when status is BLOCKED', fieldErrors: { blockedReason: ['Blocked reason is required'] } },
        { status: 400 }
      );
    }

    // Prevent COMPLETED if mandatory checklist items are incomplete
    if (data.status === 'COMPLETED') {
      const incompleteMandatory = existingTask.checklist.filter(
        (item) => item.isMandatory && !item.completed
      );
      if (incompleteMandatory.length > 0) {
        return NextResponse.json(
          {
            error: 'Cannot complete task: mandatory checklist items are incomplete',
            fieldErrors: {
              status: [`Mandatory checklist items pending: ${incompleteMandatory.map((i) => i.title).join(', ')}`],
            },
          },
          { status: 400 }
        );
      }
    }

    if (data.assigneeId) {
      const newAssignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { id: true, name: true, email: true, role: true, isActive: true, departmentId: true },
      });

      if (!newAssignee || !newAssignee.isActive) {
        return NextResponse.json(
          { error: 'Assignee not found or inactive', fieldErrors: { assigneeId: ['Assignee not found or inactive'] } },
          { status: 400 }
        );
      }

      if (!['TEAM_MEMBER', 'MANAGER'].includes(newAssignee.role)) {
        return NextResponse.json(
          { error: 'Assignee must be a Team Member or Manager', fieldErrors: { assigneeId: ['Assignee must be a Team Member or Manager'] } },
          { status: 400 }
        );
      }

      if (!canAssign(user, newAssignee as any, existingTask)) {
        return NextResponse.json({ error: 'Forbidden: Cannot assign to this user' }, { status: 403 });
      }
    }

    if (data.dueDate) {
      const due = new Date(data.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today && existingTask.status === 'NOT_STARTED') {
        return NextResponse.json(
          { error: 'Due date cannot be in the past', fieldErrors: { dueDate: ['Due date cannot be in the past'] } },
          { status: 400 }
        );
      }
    }

    const oldData = {
      title: existingTask.title,
      assigneeId: existingTask.assigneeId,
      priority: existingTask.priority,
      dueDate: existingTask.dueDate.toISOString(),
      status: existingTask.status,
      blockedReason: existingTask.blockedReason,
      percentComplete: existingTask.percentComplete,
    };

    const updateData: Record<string, unknown> = { ...data };
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

    // Set blockedAt when status changes to BLOCKED
    if (data.status === 'BLOCKED' && existingTask.status !== 'BLOCKED') {
      updateData.blockedAt = new Date();
    }

    // Clear blockedAt and blockedReason when moving away from BLOCKED
    if (existingTask.status === 'BLOCKED' && data.status && data.status !== 'BLOCKED') {
      updateData.blockedAt = null;
      updateData.blockedReason = null;
    }

    // Auto-set percentComplete to 100 on COMPLETED
    if (data.status === 'COMPLETED') {
      updateData.percentComplete = 100;
    }

    // Handle department changes on reassignment
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
      const newAssignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
        select: { id: true, departmentId: true },
      });
      if (newAssignee) {
        updateData.departmentId = newAssignee.departmentId ?? existingTask.departmentId;
        updateData.isCrossDepartment = newAssignee.departmentId !== null && existingTask.originDepartmentId !== null && newAssignee.departmentId !== existingTask.originDepartmentId;
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    const newData = {
      title: task.title,
      assigneeId: task.assigneeId,
      priority: task.priority,
      dueDate: task.dueDate.toISOString(),
      status: task.status,
      blockedReason: task.blockedReason,
      percentComplete: task.percentComplete,
    };

    await createAuditLog({
      action: data.assigneeId && data.assigneeId !== existingTask.assigneeId ? 'REASSIGN' : 'UPDATE',
      entity: 'Task',
      entityId: task.id,
      userId: user.id,
      taskId: task.id,
      oldData,
      newData,
      metadata: data.assigneeId && data.assigneeId !== existingTask.assigneeId
        ? { previousAssignee: existingTask.assignee?.name, newAssignee: task.assignee?.name }
        : undefined,
    });

    // Notify manager + creator when task is blocked
    if (data.status === 'BLOCKED' && existingTask.status !== 'BLOCKED') {
      const notifyUsers = new Set<string>();
      if (existingTask.creatorId) notifyUsers.add(existingTask.creatorId);
      // Notify department managers
      const managers = await prisma.user.findMany({
        where: { role: { in: ['SUPER_ADMIN', 'MANAGER', 'MD'] }, isActive: true },
        select: { id: true },
      });
      managers.forEach((m) => notifyUsers.add(m.id));

      await Promise.all(
        Array.from(notifyUsers).map((notifyUserId) =>
          createNotification({
            userId: notifyUserId,
            type: 'TASK_BLOCKED',
            title: 'Task Blocked',
            message: `Task "${task.title}" (${formatTaskNumber(task.taskNumber)}) has been blocked: ${data.blockedReason}`,
            metadata: { taskId: task.id, taskNumber: task.taskNumber, blockedReason: data.blockedReason },
            taskId: task.id,
          })
        )
      );
    }

    if (data.status && data.status !== existingTask.status) {
      const statusLabel = data.status.replace('_', ' ');
      const oldStatusLabel = existingTask.status.replace('_', ' ');

      const notifyUserId = existingTask.assigneeId !== user.id ? existingTask.assigneeId : existingTask.creatorId;

      if (notifyUserId && notifyUserId !== user.id) {
        await createNotification({
          userId: notifyUserId,
          type: 'TASK_STATUS_CHANGED',
          title: `Task Status: ${oldStatusLabel} → ${statusLabel}`,
          message: `Task "${task.title}" (${formatTaskNumber(task.taskNumber)}) status changed to ${statusLabel}`,
          metadata: { taskId: task.id, taskNumber: task.taskNumber, oldStatus: existingTask.status, newStatus: data.status },
          taskId: task.id,
        });
      }
    }

    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
      await createNotification({
        userId: data.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task Reassigned',
        message: `You have been assigned to task "${task.title}" (${formatTaskNumber(task.taskNumber)})`,
        metadata: { taskId: task.id, taskNumber: task.taskNumber },
        taskId: task.id,
      });
    }

    return NextResponse.json({ ...task, taskNumberDisplay: formatTaskNumber(task.taskNumber) });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('PATCH /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(canDeleteTask);

    const { id } = await params;

    const existingTask = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canDeleteTask(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      action: 'DELETE',
      entity: 'Task',
      entityId: id,
      userId: user.id,
      taskId: id,
      oldData: { title: existingTask.title, status: existingTask.status },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('DELETE /api/tasks/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
