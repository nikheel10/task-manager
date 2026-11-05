import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UPCOMING_DEADLINE_DAYS } from '@/lib/alert-rules';
import { AlertStatus, AlertType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role as 'SUPER_ADMIN' | 'MANAGER' | 'TEAM_MEMBER' | 'VIEWER';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (userRole === 'TEAM_MEMBER' || userRole === 'VIEWER') {
      if (userRole === 'VIEWER') {
        where.ownerId = userId;
      } else {
        where.OR = [{ ownerId: userId }, { createdById: userId }];
      }
    }

    const [allAlerts, overdueAlerts, upcomingAlerts] = await Promise.all([
      prisma.alert.findMany({
        where,
        select: { status: true, type: true },
      }),
      prisma.alert.findMany({
        where: {
          ...where,
          dueDate: { lt: today },
          status: { notIn: ['COMPLETED', 'OVERDUE', 'CANCELLED'] },
        },
      }),
      prisma.alert.findMany({
        where: {
          ...where,
          dueDate: { gte: today, lte: new Date(today.getTime() + UPCOMING_DEADLINE_DAYS * 86400000) },
          status: { notIn: ['COMPLETED', 'OVERDUE', 'CANCELLED'] },
        },
      }),
    ]);

    const stats = {
      total: allAlerts.length,
      statusCounts: {} as Record<string, number>,
      typeCounts: {} as Record<string, number>,
      overdue: overdueAlerts.length,
      upcoming: upcomingAlerts.length,
    };

    for (const alert of allAlerts) {
      stats.statusCounts[alert.status] = (stats.statusCounts[alert.status] || 0) + 1;
      stats.typeCounts[alert.type] = (stats.typeCounts[alert.type] || 0) + 1;
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/alerts/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}