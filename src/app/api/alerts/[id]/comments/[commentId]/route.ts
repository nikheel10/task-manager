import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { hasMinRole } from '@/lib/rbac';
import { updateCommentSchema } from '@/lib/validators/task';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, commentId } = await params;
    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const comment = await prisma.alertComment.findFirst({
      where: { id: commentId, alertId: id, deletedAt: null },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

    if (!hasMinRole(userRole, 'MANAGER') && userId !== comment.authorId) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit this comment' }, { status: 403 });
    }

    const oldContent = comment.content;
    const updatedComment = await prisma.alertComment.update({
      where: { id: commentId },
      data: { content: parsed.data.content, editedAt: new Date() },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'AlertComment',
      entityId: commentId,
      userId: session.user.id,
      alertId: id,
      oldData: { content: oldContent },
      newData: { content: parsed.data.content },
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('PATCH /api/alerts/[id]/comments/[commentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, commentId } = await params;

    const comment = await prisma.alertComment.findFirst({
      where: { id: commentId, alertId: id, deletedAt: null },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

    if (!hasMinRole(userRole, 'MANAGER') && userId !== comment.authorId) {
      return NextResponse.json({ error: 'Forbidden: Cannot delete this comment' }, { status: 403 });
    }

    await prisma.alertComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      action: 'DELETE',
      entity: 'AlertComment',
      entityId: commentId,
      userId: session.user.id,
      alertId: id,
      oldData: { content: comment.content },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/alerts/[id]/comments/[commentId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}