import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { canViewTask } from '@/lib/access';
import { canEditComment, canDeleteComment } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { commentUpdateSchema as updateCommentSchema } from '@/lib/validators';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await requireAuth();

    const { id, commentId } = await params;
    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, taskId: id, deletedAt: null },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
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

    if (!canEditComment(user.role, user.id, comment.authorId)) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit this comment' }, { status: 403 });
    }

    const oldContent = comment.content;
    const updatedComment = await prisma.taskComment.update({
      where: { id: commentId },
      data: { content: parsed.data.content, editedAt: new Date(), edited: true },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'TaskComment',
      entityId: commentId,
      userId: user.id,
      taskId: id,
      oldData: { content: oldContent },
      newData: { content: parsed.data.content },
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('PATCH /api/tasks/[id]/comments/[commentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await requireAuth();

    const { id, commentId } = await params;

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, taskId: id, deletedAt: null },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
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

    if (!canDeleteComment(user.role, user.id, comment.authorId)) {
      return NextResponse.json({ error: 'Forbidden: Cannot delete this comment' }, { status: 403 });
    }

    await prisma.taskComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      action: 'DELETE',
      entity: 'TaskComment',
      entityId: commentId,
      userId: user.id,
      taskId: id,
      oldData: { content: comment.content },
    });

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
    console.error('DELETE /api/tasks/[id]/comments/[commentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
