import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { taskScopeWhere, isGlobalViewer, canWrite } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!canWrite(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const projectId = searchParams.get('projectId');
    const exportCsv = searchParams.get('export');
    const requestedDepartmentId = searchParams.get('departmentId');

    // Only global viewers can filter by departmentId
    const effectiveDepartmentId = isGlobalViewer(user) ? requestedDepartmentId : undefined;

    const where: Record<string, unknown> = {
      deletedAt: null,
      ...taskScopeWhere(user, effectiveDepartmentId),
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
    }

    if (projectId) where.projectId = projectId;

    const [tasks, overdueTasks, blockedTasks] = await Promise.all([
      prisma.task.findMany({ where }),
      prisma.task.count({ where: { ...where, dueDate: { lt: new Date() }, status: { notIn: ['COMPLETED', 'CLOSED'] } } }),
      prisma.task.count({ where: { ...where, status: 'BLOCKED' } }),
    ]);

    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const task of tasks) {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      if (task.categoryId) byCategory[task.categoryId] = (byCategory[task.categoryId] || 0) + 1;
    }

    const completedCount = byStatus['COMPLETED'] || 0;
    const closedCount = byStatus['CLOSED'] || 0;
    const completionRate = tasks.length > 0 ? Math.round(((completedCount + closedCount) / tasks.length) * 100) : 0;

    let estimated = 0;
    let actual = 0;
    for (const task of tasks) {
      estimated += task.estimatedHours ?? 0;
      actual += task.actualHours ?? 0;
    }

    // Ageing
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ageing1to7 = await prisma.task.count({
      where: {
        ...where,
        status: { notIn: ['COMPLETED', 'CLOSED'] },
        dueDate: {
          lt: new Date(today.getTime() + 7 * 86400000),
          gte: new Date(today.getTime() - 7 * 86400000),
        },
      },
    });
    const ageing8to30 = await prisma.task.count({
      where: {
        ...where,
        status: { notIn: ['COMPLETED', 'CLOSED'] },
        dueDate: {
          lt: new Date(today.getTime() + 30 * 86400000),
          gte: new Date(today.getTime() + 7 * 86400000),
        },
      },
    });
    const ageing30plus = await prisma.task.count({
      where: {
        ...where,
        status: { notIn: ['COMPLETED', 'CLOSED'] },
        dueDate: { lt: new Date(today.getTime() + 30 * 86400000) },
      },
    }) - ageing1to7 - ageing8to30;

    const stats = {
      total: tasks.length,
      byStatus,
      byPriority,
      byCategory,
      overdue: overdueTasks,
      blockedCount: blockedTasks,
      completionRate,
      estimatedVsActual: { estimated, actual },
      ageing: {
        '1-7': ageing1to7,
        '8-30': ageing8to30,
        '30plus': Math.max(0, ageing30plus),
      },
    };

    if (exportCsv === 'csv') {
      const csvHeader = 'Status,Priority,Category,Count';
      const csvRows = Object.entries(byStatus).map(([status, count]) => `${status},,,${count}`).join('\n');
      const csvContent = [csvHeader, ...csvRows.split('\n')].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="task-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('GET /api/reports/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}