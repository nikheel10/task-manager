import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/rbac';
import { canViewAlert, canEditAlert, isGlobalViewer } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { alertUpdateSchema as updateAlertSchema } from '@/lib/validators';
import { formatAlertNumber, validateAlertStatusTransition } from '@/lib/alert-rules';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const alert = await prisma.alert.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        entity: { select: { id: true, name: true, type: true, jurisdiction: true } },
        department: { select: { id: true, name: true, code: true } },
        comments: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        evidence: {
          include: { uploadedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        reminderRules: true,
        escalationRules: { include: { escalateTo: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (!canViewAlert(user, alert)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = alert.dueDate < today && !['COMPLETED', 'CANCELLED'].includes(alert.status);

    return NextResponse.json({
      ...alert,
      alertNumberDisplay: formatAlertNumber(alert.alertNumber),
      isOverdue,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('GET /api/alerts/[id] error:', error);
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
    const parsed = updateAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existingAlert = await prisma.alert.findFirst({
      where: { id, deletedAt: null },
      include: { owner: { select: { id: true } } },
    });

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (!canEditAlert(user, existingAlert)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TEAM_MEMBER can only update their own alerts (status only)
    if (user.role === 'TEAM_MEMBER') {
      if (existingAlert.ownerId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: Cannot modify alert not assigned to you' }, { status: 403 });
      }
      const allowedKeys = ['status'];
      const updateKeys = Object.keys(parsed.data);
      if (updateKeys.some((k) => !allowedKeys.includes(k))) {
        return NextResponse.json(
          { error: 'Forbidden: Team members can only update status' },
          { status: 403 }
        );
      }
    }

    const data = parsed.data;

    if (data.status && data.status !== existingAlert.status) {
      const transition = validateAlertStatusTransition(existingAlert.status, data.status);
      if (!transition.valid) {
        return NextResponse.json(
          { error: transition.error, fieldErrors: { status: [transition.error!] } },
          { status: 400 }
        );
      }
    }

    const oldData = {
      title: existingAlert.title,
      status: existingAlert.status,
      priority: existingAlert.priority,
      ownerId: existingAlert.ownerId,
      dueDate: existingAlert.dueDate.toISOString(),
    };

    const updateData: Record<string, unknown> = { ...data };
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.triggerDate) updateData.triggerDate = new Date(data.triggerDate);
    if (data.recurrenceEndDate) updateData.recurrenceEndDate = new Date(data.recurrenceEndDate);

    const alert = await prisma.alert.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        entity: { select: { id: true, name: true, type: true, jurisdiction: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    const newData = {
      title: alert.title,
      status: alert.status,
      priority: alert.priority,
      ownerId: alert.ownerId,
      dueDate: alert.dueDate.toISOString(),
    };

    await createAuditLog({
      action: 'UPDATE',
      entity: 'Alert',
      entityId: alert.id,
      userId: user.id,
      alertId: id,
      oldData,
      newData,
    });

    if (data.ownerId && data.ownerId !== existingAlert.ownerId) {
      await createNotification({
        userId: data.ownerId,
        type: 'ALERT_REASSIGNED',
        title: 'Alert Reassigned',
        message: `Alert "${alert.title}" (${formatAlertNumber(alert.alertNumber)}) has been reassigned to you.`,
        metadata: { alertId: id, alertNumber: alert.alertNumber },
        alertId: id,
      });
    }

    if (data.status && data.status !== existingAlert.status) {
      const statusLabel = data.status.replace('_', ' ');
      const oldStatusLabel = existingAlert.status.replace('_', ' ');
      const notifyUserId = alert.ownerId !== user.id ? alert.ownerId : existingAlert.createdById;

      if (notifyUserId && notifyUserId !== user.id) {
        await createNotification({
          userId: notifyUserId,
          type: 'ALERT_STATUS_CHANGED',
          title: `Alert Status: ${oldStatusLabel} → ${statusLabel}`,
          message: `Alert "${alert.title}" (${formatAlertNumber(alert.alertNumber)}) status changed to ${statusLabel}`,
          metadata: {
            alertId: id,
            alertNumber: alert.alertNumber,
            oldStatus: existingAlert.status,
            newStatus: data.status,
          },
          alertId: id,
        });
      }
    }

    return NextResponse.json({ ...alert, alertNumberDisplay: formatAlertNumber(alert.alertNumber) });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('PATCH /api/alerts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('MANAGER');

    const { id } = await params;

    const existingAlert = await prisma.alert.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (!isGlobalViewer(user) && existingAlert.departmentId !== user.departmentId && existingAlert.ownerId !== user.id && existingAlert.createdById !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.alert.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await createAuditLog({
      action: 'DELETE',
      entity: 'Alert',
      entityId: id,
      userId: user.id,
      alertId: id,
      oldData: { title: existingAlert.title, status: existingAlert.status },
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
    console.error('DELETE /api/alerts/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}