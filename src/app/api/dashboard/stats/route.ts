import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { taskScopeWhere, alertScopeWhere, isGlobalViewer } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { UPCOMING_DEADLINE_DAYS } from '@/lib/task-rules';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const requestedDepartmentId = searchParams.get('departmentId') || undefined;
    
    // Only global viewers can use the departmentId filter
    const effectiveDepartmentId = isGlobalViewer(user) ? requestedDepartmentId : undefined;

    const taskWhere: Record<string, unknown> = {
      deletedAt: null,
      ...taskScopeWhere(user, effectiveDepartmentId),
    };

    const alertWhere: Record<string, unknown> = {
      deletedAt: null,
      ...alertScopeWhere(user, effectiveDepartmentId),
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = new Date(today);
    upcoming.setDate(upcoming.getDate() + UPCOMING_DEADLINE_DAYS);

    const [
      total,
      notStarted,
      inProgress,
      completed,
      closed,
      overdue,
      upcomingCount,
      byPriority,
      byStatus,
      pendingVerification,
    ] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      prisma.task.count({ where: { ...taskWhere, status: 'NOT_STARTED' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...taskWhere, status: 'CLOSED' } }),
      prisma.task.count({
        where: { ...taskWhere, dueDate: { lt: today }, status: { notIn: ['COMPLETED', 'CLOSED'] } },
      }),
      prisma.task.count({
        where: { ...taskWhere, dueDate: { gte: today, lte: upcoming }, status: { notIn: ['COMPLETED', 'CLOSED'] } },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: taskWhere,
        _count: true,
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: taskWhere,
        _count: true,
      }),
      prisma.task.count({
        where: { ...taskWhere, status: 'COMPLETED', verificationStatus: 'PENDING' },
      }),
    ]);

    const completedTotal = completed + closed;
    const completionRate = total > 0 ? Math.round((completedTotal / total) * 100) : 0;

    const overdueAlerts = await prisma.alert.count({
      where: { ...alertWhere, dueDate: { lt: today }, status: { notIn: ['COMPLETED', 'CANCELLED', 'OVERDUE'] } },
    });

    return NextResponse.json({
      totals: { total, notStarted, inProgress, completed, closed },
      overdue,
      upcoming: upcomingCount,
      pendingVerification,
      avgProgress: completionRate,
      overdueAlerts,
      byPriority: byPriority.reduce((acc, item) => ({ ...acc, [item.priority]: item._count }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item._count }), {}),
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
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}