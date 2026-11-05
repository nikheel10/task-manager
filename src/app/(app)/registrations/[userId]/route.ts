import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuth();
    const { userId } = await params;
    const body = await request.json();
    const { action, reason } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, employeeId: true, role: true, status: true, departmentId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Registration request not found' }, { status: 404 });
    }

    if (targetUser.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be approved or rejected' },
        { status: 409 }
      );
    }

    // MANAGER can only act on own department requests
    if (user.role === 'MANAGER') {
      if (!user.departmentId || targetUser.departmentId !== user.departmentId) {
        return NextResponse.json(
          { error: 'Forbidden: Can only act on own department requests' },
          { status: 403 }
        );
      }
    }

    let updateData: Record<string, unknown> = {};
    let notificationMessage: string;
    let notificationType: string;

    if (action === 'approve') {
      updateData = {
        status: 'ACTIVE',
        isActive: true,
        approvedById: user.id,
        approvedAt: new Date(),
        rejectionReason: null,
      };
      notificationMessage = `Your registration request has been approved by ${user.name}. You can now log in.`;
      notificationType = 'REGISTRATION_APPROVED';
    } else if (action === 'reject') {
      if (!reason || reason.length < 5) {
        return NextResponse.json(
          { error: 'Rejection reason must be at least 5 characters' },
          { status: 400 }
        );
      }
      updateData = {
        status: 'REJECTED',
        isActive: false,
        rejectionReason: reason,
      };
      notificationMessage = `Your registration request was rejected: ${reason}`;
      notificationType = 'REGISTRATION_REJECTED';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, status: true },
    });

    await createNotification({
      userId: updated.id,
      type: notificationType,
      title: action === 'approve' ? 'Registration Approved' : 'Registration Rejected',
      message: notificationMessage,
      metadata: { userId: updated.id, action, reason },
    });

    await createAuditLog({
      action: action.toUpperCase(),
      entity: 'User',
      entityId: updated.id,
      userId: user.id,
      oldData: { status: 'PENDING' },
      newData: { status: updateData.status, reason: action === 'reject' ? reason : undefined },
    });

    return NextResponse.json({ message: `Registration ${action}d successfully`, user: updated });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
