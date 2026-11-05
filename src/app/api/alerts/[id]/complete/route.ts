import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { requireRole } from '@/lib/rbac';
import { calculateNextDueDate, formatAlertNumber, REQUIRE_EVIDENCE_ON_COMPLETE } from '@/lib/alert-rules';

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
    const body = await request.json().catch(() => ({}));
    const evidenceRequired = body.evidenceRequired ?? REQUIRE_EVIDENCE_ON_COMPLETE;

    const existingAlert = await prisma.alert.findFirst({
      where: { id, deletedAt: null },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';

    // Only owner or manager can complete
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'MANAGER') {
      if (existingAlert.ownerId !== userId) {
        return NextResponse.json({ error: 'Forbidden: Only the owner or manager can complete this alert' }, { status: 403 });
      }
    }

    // Check if evidence is required
    if (evidenceRequired) {
      const evidenceCount = await prisma.alertEvidence.count({
        where: { alertId: id },
      });
      if (evidenceCount === 0) {
        return NextResponse.json(
          { error: 'At least one evidence file is required to complete this alert' },
          { status: 400 }
        );
      }
    }

    // Use transaction to update alert and generate next occurrence if recurring
    const result = await prisma.$transaction(async (tx) => {
      await tx.alert.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await createAuditLog({
        action: 'COMPLETE',
        entity: 'Alert',
        entityId: id,
        userId: session.user.id,
        taskId: id,
        oldData: { status: existingAlert.status },
        newData: { status: 'COMPLETED', completedAt: new Date() },
      });

      // Generate next occurrence if recurring
      let nextAlertId: string | null = null;
      const recurrence = existingAlert.recurrence;
      const today = new Date();

      if (
        recurrence !== 'ONE_TIME' &&
        (!existingAlert.recurrenceEndDate || existingAlert.recurrenceEndDate > today)
      ) {
        // Check if next alert already exists
        const existingNext = await tx.alert.findFirst({
          where: { parentAlertId: id, status: { in: ['OPEN', 'IN_PROGRESS', 'OVERDUE'] } },
        });

        if (!existingNext) {
          const nextDueDate = calculateNextDueDate(existingAlert.dueDate, recurrence, existingAlert.recurrenceIntervalDays || undefined);

          if (nextDueDate) {
            const nextAlert = await tx.alert.create({
              data: {
                title: existingAlert.title,
                reference: existingAlert.reference,
                description: existingAlert.description,
                type: existingAlert.type,
                status: 'OPEN',
                priority: existingAlert.priority,
                entityId: existingAlert.entityId,
                ownerId: existingAlert.ownerId,
                departmentId: existingAlert.departmentId,
                createdById: session.user.id,
                regulatoryClause: existingAlert.regulatoryClause,
                triggerDate: nextDueDate,
                dueDate: nextDueDate,
                recurrence,
                recurrenceIntervalDays: existingAlert.recurrenceIntervalDays,
                recurrenceEndDate: existingAlert.recurrenceEndDate,
                parentAlertId: id,
              },
            });
            nextAlertId = nextAlert.id;

            // Carry over reminder rules
            const reminderRules = await tx.alertReminderRule.findMany({
              where: { alertId: id },
            });

            if (reminderRules.length > 0) {
              await tx.alertReminderRule.createMany({
                data: reminderRules.map((rule) => ({
                  alertId: nextAlert.id,
                  daysBefore: rule.daysBefore,
                  isActive: rule.isActive,
                })),
              });
            }

            // Carry over escalation rules
            const escalationRules = await tx.alertEscalationRule.findMany({
              where: { alertId: id },
            });

            if (escalationRules.length > 0) {
              await tx.alertEscalationRule.createMany({
                data: escalationRules.map((rule) => ({
                  alertId: nextAlert.id,
                  afterDaysOverdue: rule.afterDaysOverdue,
                  escalateToRole: rule.escalateToRole,
                  escalateToUserId: rule.escalateToUserId,
                  isActive: rule.isActive,
                })),
              });
            }
          }
        }
      }

      return { nextAlertId };
    });

    // Notify owner about completion
    await createNotification({
      userId: existingAlert.ownerId,
      type: 'ALERT_COMPLETED',
      title: 'Alert Completed',
      message: `Alert "${existingAlert.title}" (${formatAlertNumber(existingAlert.alertNumber)}) has been completed.`,
      metadata: { alertId: id, alertNumber: existingAlert.alertNumber },
      alertId: id,
    });

    // Notify about next occurrence if created
    if (result.nextAlertId) {
      await createNotification({
        userId: existingAlert.ownerId,
        type: 'ALERT_RENEWED',
        title: 'New Alert Occurrence',
        message: `A new occurrence of recurring alert "${existingAlert.title}" has been created.`,
        metadata: { alertId: result.nextAlertId, parentAlertId: id },
        alertId: result.nextAlertId,
      });
    }

    return NextResponse.json({ success: true, nextAlertId: result.nextAlertId });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('POST /api/alerts/[id]/complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}