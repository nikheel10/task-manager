import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { requireRole } from '@/lib/rbac';
import { verificationSchema } from '@/lib/validators/task';
import { formatTaskNumber } from '@/lib/task-rules';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('MANAGER');
    const { id } = await params;
    const body = await request.json();
    const parsed = verificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const task = await prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Task must be in COMPLETED status to verify', fieldErrors: { status: ['Task must be completed first'] } },
        { status: 400 }
      );
    }

    const { outcome, reason } = parsed.data;

    if (outcome === 'VERIFIED') {
      await prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id },
          data: { status: 'CLOSED', verifiedById: session.id, verifiedAt: new Date() },
        });

        await tx.taskVerification.create({
          data: { taskId: id, outcome: 'VERIFIED', verifierId: session.id },
        });

        await createAuditLog({
          action: 'VERIFY',
          entity: 'Task',
          entityId: id,
          userId: session.id,
          taskId: id,
          newData: { status: 'CLOSED', verifiedById: session.id, outcome: 'VERIFIED' },
        });
      });

      await createNotification({
        userId: task.assigneeId,
        type: 'TASK_VERIFIED',
        title: 'Task Verified',
        message: `Your task "${task.title}" (${formatTaskNumber(task.taskNumber)}) has been verified and closed.`,
        metadata: { taskId: id, taskNumber: task.taskNumber },
        taskId: id,
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.task.update({
          where: { id },
          data: { status: 'IN_PROGRESS' },
        });

        await tx.taskVerification.create({
          data: { taskId: id, outcome: 'REJECTED', reason: reason ?? null, verifierId: session.id },
        });

        await tx.taskComment.create({
          data: {
            content: `Verification rejected: ${reason}`,
            taskId: id,
            authorId: session.id,
          },
        });

        await createAuditLog({
          action: 'REJECT',
          entity: 'Task',
          entityId: id,
          userId: session.id,
          taskId: id,
          newData: { status: 'IN_PROGRESS', outcome: 'REJECTED', reason },
        });
      });

      await createNotification({
        userId: task.assigneeId,
        type: 'TASK_REJECTED',
        title: 'Task Rejected',
        message: `Your task "${task.title}" (${formatTaskNumber(task.taskNumber)}) was rejected: ${reason}`,
        metadata: { taskId: id, taskNumber: task.taskNumber, reason },
        taskId: id,
      });
    }

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        verifier: { select: { id: true, name: true } },
        verifications: {
          include: { verifier: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json({ ...updatedTask!, taskNumberDisplay: formatTaskNumber(updatedTask!.taskNumber) });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('POST /api/tasks/[id]/verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}