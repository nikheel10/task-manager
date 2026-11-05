import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/rbac';
import { alertScopeWhere, isGlobalViewer } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { alertCreateSchema as createAlertSchema, alertQuerySchema } from '@/lib/validators';
import { formatAlertNumber, UPCOMING_DEADLINE_DAYS } from '@/lib/alert-rules';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const parsed = alertQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { search, type, status, priority, ownerId, entityId, dueFrom, dueTo, overdue, page, limit, departmentId } = parsed.data;
    
    // Only global viewers can filter by departmentId
    const effectiveDepartmentId = isGlobalViewer(user) ? departmentId : undefined;

    // Apply department scope first - user filters cannot override scope
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...alertScopeWhere(user, effectiveDepartmentId),
    };

    if (search) {
      const alertNum = parseInt(search.replace(/^ALT-?/i, ''), 10);
      const isAlertNum = !isNaN(alertNum);
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        ...(isAlertNum ? [{ alertNumber: alertNum }] : []),
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (ownerId) where.ownerId = ownerId;
    if (entityId) where.entityId = entityId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateFilter: Record<string, unknown> = {};
    if (dueFrom) dateFilter.gte = new Date(dueFrom);
    if (dueTo) dateFilter.lte = new Date(dueTo);
    if (Object.keys(dateFilter).length > 0) where.dueDate = dateFilter;

    if (overdue) {
      where.dueDate = { lt: today };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true, role: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          entity: { select: { id: true, name: true, type: true, jurisdiction: true } },
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { comments: true, evidence: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    const alertsWithFlags = alerts.map((alert) => ({
      ...alert,
      alertNumberDisplay: formatAlertNumber(alert.alertNumber),
      isOverdue: alert.dueDate < today && !['COMPLETED', 'CANCELLED'].includes(alert.status),
    }));

    return NextResponse.json({
      alerts: alertsWithFlags,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
    console.error('GET /api/alerts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('MANAGER');
    const body = await request.json();
    const parsed = createAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, reference, description, type, priority, entityId, ownerId, regulatoryClause, triggerDate, dueDate, recurrence, recurrenceIntervalDays, recurrenceEndDate } = parsed.data;

    // Verify owner exists and is eligible
    const owner = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, email: true, role: true, isActive: true, departmentId: true },
    });

    if (!owner || !owner.isActive) {
      return NextResponse.json(
        { error: 'Owner not found or inactive', fieldErrors: { ownerId: ['Owner not found or inactive'] } },
        { status: 400 }
      );
    }

    // Verify entity exists if provided
    if (entityId) {
      const entity = await prisma.entity.findUnique({ where: { id: entityId } });
      if (!entity) {
        return NextResponse.json(
          { error: 'Entity not found', fieldErrors: { entityId: ['Entity not found'] } },
          { status: 400 }
        );
      }
    }

    const creatorDeptId = user.departmentId;
    const alertDeptId = owner.departmentId ?? creatorDeptId;

    if (!alertDeptId) {
      return NextResponse.json(
        { error: 'Department is required to create an alert', fieldErrors: { departmentId: ['Department is required'] } },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        title,
        reference,
        description,
        type,
        priority,
        entityId,
        ownerId,
        departmentId: alertDeptId,
        createdById: user.id,
        regulatoryClause,
        triggerDate: new Date(triggerDate),
        dueDate: new Date(dueDate),
        recurrence,
        recurrenceIntervalDays,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
        status: 'OPEN',
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        entity: { select: { id: true, name: true, type: true, jurisdiction: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Alert',
      entityId: alert.id,
      userId: user.id,
      alertId: alert.id,
      newData: { title, type, priority, ownerId, entityId, dueDate, recurrence, departmentId: alert.departmentId },
    });

    // Create default reminder rules
    await prisma.alertReminderRule.createMany({
      data: [90, 60, 30].map((days) => ({
        alertId: alert.id,
        daysBefore: days,
        isActive: true,
      })),
    });

    // Create default escalation rules
    await prisma.alertEscalationRule.createMany({
      data: [
        { alertId: alert.id, afterDaysOverdue: 3, escalateToRole: 'MANAGER' },
        { alertId: alert.id, afterDaysOverdue: 7, escalateToRole: 'SUPER_ADMIN' },
      ],
    });

    // Notify owner
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
    console.error('POST /api/alerts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}