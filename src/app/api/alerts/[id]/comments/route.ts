import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { hasMinRole } from '@/lib/rbac';
import { alertCommentSchema } from '@/lib/validators/task';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const alert = await prisma.alert.findFirst({
      where: { id, deletedAt: null },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

    if (userRole === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (userRole === 'TEAM_MEMBER' && alert.ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comments = await prisma.alertComment.findMany({
      where: { alertId: id, deletedAt: null },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('GET /api/alerts/[id]/comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = alertCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findFirst({
      where: { id, deletedAt: null },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

    if (userRole === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (userRole === 'TEAM_MEMBER' && alert.ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden: Cannot comment on alert not assigned to you' }, { status: 403 });
    }

    const comment = await prisma.alertComment.create({
      data: {
        content: parsed.data.content,
        alertId: id,
        authorId: userId,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'AlertComment',
      entityId: comment.id,
      userId: session.user.id,
      alertId: id,
      newData: { content: comment.content },
    });

    // Notify owner if commenter is not the owner
    if (alert.ownerId !== userId) {
      await createNotification({
        userId: alert.ownerId,
        type: 'ALERT_COMMENT',
        title: 'New Comment',
        message: `${session.user.name ?? session.user.email} commented on alert "${alert.title}"`,
        metadata: { alertId: id, commentId: comment.id },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('POST /api/alerts/[id]/comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}