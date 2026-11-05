import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { requireRole } from '@/lib/rbac';
import { formatAlertNumber } from '@/lib/alert-rules';
import { z } from 'zod';

const fromTemplateSchema = z.object({
  templateId: z.string().min(1, 'Invalid template'),
  entityId: z.string().min(1, 'Invalid entity'),
  ownerId: z.string().min(1, 'Invalid owner'),
  dueDays: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('MANAGER');
    const body = await request.json();
    const parsed = fromTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { templateId, entityId, ownerId, dueDays } = parsed.data;

    const template = await prisma.regulatoryTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.isActive) {
      return NextResponse.json(
        { error: 'Template not found or inactive', fieldErrors: { templateId: ['Template not found or inactive'] } },
        { status: 400 }
      );
    }

    const entity = await prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) {
      return NextResponse.json(
        { error: 'Entity not found', fieldErrors: { entityId: ['Entity not found'] } },
        { status: 400 }
      );
    }

    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, isActive: true, role: true, departmentId: true },
    });

    if (!owner || !owner.isActive) {
      return NextResponse.json(
        { error: 'Owner not found or inactive', fieldErrors: { ownerId: ['Owner not found or inactive'] } },
        { status: 400 }
      );
    }

    if (!['TEAM_MEMBER', 'MANAGER'].includes(owner.role)) {
      return NextResponse.json(
        { error: 'Owner must be a Team Member or Manager', fieldErrors: { ownerId: ['Invalid owner role'] } },
        { status: 400 }
      );
    }

    const triggerDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (dueDays || template.defaultLeadDays || 30));

    const alert = await prisma.alert.create({
      data: {
        title: template.title,
        description: `Generated from template: ${template.title}`,
        type: template.type,
        priority: 'MEDIUM',
        entityId,
        ownerId,
        departmentId: owner.departmentId ?? '',
        createdById: session.id,
        regulatoryClause: template.regulatoryClause,
        triggerDate,
        dueDate,
        recurrence: template.defaultRecurrence,
        status: 'OPEN',
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        entity: { select: { id: true, name: true, type: true } },
      },
    });

    await createAuditLog({
      action: 'CREATE_FROM_TEMPLATE',
      entity: 'Alert',
      entityId: alert.id,
      userId: session.id,
      alertId: alert.id,
      newData: { templateId, entityId, ownerId, dueDate: dueDate.toISOString() },
    });

    await createNotification({
      userId: ownerId,
      type: 'ALERT_ASSIGNED',
      title: 'New Alert Assigned',
      message: `You have been assigned alert "${alert.title}" (${formatAlertNumber(alert.alertNumber)})`,
      metadata: { alertId: alert.id, alertNumber: alert.alertNumber },
      alertId: alert.id,
    });

    return NextResponse.json({ ...alert, alertNumberDisplay: formatAlertNumber(alert.alertNumber) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('POST /api/alerts/from-template error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}