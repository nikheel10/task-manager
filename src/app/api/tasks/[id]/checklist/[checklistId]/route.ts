import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { canViewTask, hasMinRole } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { checklistUpdateSchema as updateChecklistItemSchema } from '@/lib/validators';
import { syncTaskProgress } from '@/lib/checklist-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const user = await requireAuth();

    const { id, checklistId } = await params;
    const body = await request.json();
    const parsed = updateChecklistItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId: id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canViewTask(user, task)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const onlyToggleCompleted =
      Object.keys(parsed.data).length === 1 && parsed.data.completed !== undefined;

    if (onlyToggleCompleted) {
      const isAssignee = user.role === 'TEAM_MEMBER' && user.id === task.assigneeId;
      if (!isAssignee && !hasMinRole(user.role, 'MANAGER')) {
        return NextResponse.json({ error: 'Forbidden: Only the assigned performer or Admin/Manager can tick/untick items' }, { status: 403 });
      }
    } else {
      if (!hasMinRole(user.role, 'MANAGER')) {
        return NextResponse.json({ error: 'Forbidden: Manager or Admin role required' }, { status: 403 });
      }
    }

    if (parsed.data.title && parsed.data.title !== item.title) {
      const duplicate = await prisma.taskChecklist.findFirst({
        where: { taskId: id, title: { equals: parsed.data.title, mode: 'insensitive' }, id: { not: checklistId } },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'A checklist item with this title already exists', fieldErrors: { title: ['Duplicate item'] } },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.completed !== undefined) {
      updateData.userId = parsed.data.completed ? user.id : null;
      updateData.doneAt = parsed.data.completed ? new Date() : null;
    }

    const oldData = { title: item.title, completed: item.completed, isMandatory: item.isMandatory, order: item.order };
    const updatedItem = await prisma.taskChecklist.update({
      where: { id: checklistId },
      data: updateData,
      include: { user: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'TaskChecklist',
      entityId: checklistId,
      userId: user.id,
      taskId: id,
      oldData,
      newData: { title: updatedItem.title, completed: updatedItem.completed, isMandatory: updatedItem.isMandatory, order: updatedItem.order, doneAt: updatedItem.doneAt },
    });

    await syncTaskProgress(id);

    return NextResponse.json(updatedItem);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('PATCH /api/tasks/[id]/checklist/[checklistId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string }> }
) {
  try {
    const user = await requireAuth();

    const { id, checklistId } = await params;

    const item = await prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId: id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canViewTask(user, task)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!hasMinRole(user.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden: Manager or Admin role required' }, { status: 403 });
    }

    await prisma.taskChecklist.delete({ where: { id: checklistId } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'TaskChecklist',
      entityId: checklistId,
      userId: user.id,
      taskId: id,
      oldData: { title: item.title, completed: item.completed },
    });

    await syncTaskProgress(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('DELETE /api/tasks/[id]/checklist/[checklistId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
