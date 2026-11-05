import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { alertReminderRuleSchema } from '@/lib/validators/task';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category } = await params;

    if (category === 'reminder-rules') {
      const rules = await prisma.alertReminderRule.findMany({
        where: { alertId: null },
        orderBy: { daysBefore: 'asc' },
      });
      return NextResponse.json(rules);
    }

    if (category === 'escalation-rules') {
      const rules = await prisma.alertEscalationRule.findMany({
        where: { alertId: null },
        orderBy: { afterDaysOverdue: 'asc' },
      });
      return NextResponse.json(rules);
    }

    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/settings/[category] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const session = await requireRole('SUPER_ADMIN');
    const { category } = await params;
    const body = await request.json();

    if (category === 'reminder-rules') {
      if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'Expected array of reminder rules' }, { status: 400 });
      }

      const validated = body.map((item) => alertReminderRuleSchema.safeParse({ ...item, alertId: null }));
      const failed = validated.find((r) => !r.success);
      if (failed) {
        return NextResponse.json(
          { error: 'Validation failed', fieldErrors: failed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.alertReminderRule.deleteMany({ where: { alertId: null } });
        await tx.alertReminderRule.createMany({
          data: body.map((item: { daysBefore: number; isActive: boolean }) => ({
            alertId: null,
            daysBefore: item.daysBefore,
            isActive: item.isActive ?? true,
          })),
        });
      });

      const updated = await prisma.alertReminderRule.findMany({
        where: { alertId: null },
        orderBy: { daysBefore: 'asc' },
      });

      return NextResponse.json(updated);
    }

    if (category === 'escalation-rules') {
      if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'Expected array of escalation rules' }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.alertEscalationRule.deleteMany({ where: { alertId: null } });
        await tx.alertEscalationRule.createMany({
          data: body.map((item: { afterDaysOverdue: number; escalateToRole: string | null; isActive: boolean }) => ({
            alertId: null,
            afterDaysOverdue: item.afterDaysOverdue,
            escalateToRole: item.escalateToRole,
            isActive: item.isActive ?? true,
          })),
        });
      });

      const updated = await prisma.alertEscalationRule.findMany({
        where: { alertId: null },
        orderBy: { afterDaysOverdue: 'asc' },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Unknown category' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN role required' }, { status: 403 });
      }
    }
    console.error('PUT /api/settings/[category] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}