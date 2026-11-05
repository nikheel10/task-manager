import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { canViewTask, hasMinRole } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { checklistCreateSchema as checklistItemSchema } from '@/lib/validators';
import { syncTaskProgress } from '@/lib/checklist-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!canViewTask(user, task)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checklist = await prisma.taskChecklist.findMany({
      where: { taskId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('GET /api/tasks/[id]/checklist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const parsed = checklistItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
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

    const existing = await prisma.taskChecklist.findFirst({
      where: { taskId: id, title: { equals: parsed.data.title, mode: 'insensitive' } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A checklist item with this title already exists', fieldErrors: { title: ['Duplicate item'] } },
        { status: 400 }
      );
    }

    const item = await prisma.taskChecklist.create({
      data: {
        title: parsed.data.title,
        completed: parsed.data.completed,
        doneAt: parsed.data.completed && parsed.data.doneAt ? new Date(parsed.data.doneAt) : (parsed.data.completed ? new Date() : null),
        isMandatory: parsed.data.isMandatory,
        order: parsed.data.order,
        taskId: id,
        userId: parsed.data.completed ? user.id : null,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'TaskChecklist',
      entityId: item.id,
      userId: user.id,
      taskId: id,
      newData: { title: item.title, completed: item.completed },
    });

    if (parsed.data.completed) {
      await syncTaskProgress(id);
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('POST /api/tasks/[id]/checklist error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
