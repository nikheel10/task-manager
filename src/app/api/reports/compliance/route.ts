import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await requireRole('MANAGER');

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const entityId = searchParams.get('entityId');
    const exportCsv = searchParams.get('export');

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
    }

    if (entityId) where.entityId = entityId;

    const [alerts, overdueAlerts] = await Promise.all([
      prisma.alert.findMany({ where }),
      prisma.alert.count({ where: { ...where, dueDate: { lt: new Date() }, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
    ]);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const alert of alerts) {
      byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    }

    const stats = {
      total: alerts.length,
      byStatus,
      byType,
      overdue: overdueAlerts,
    };

    if (exportCsv === 'csv') {
      const csvHeader = 'Type,Status,Count';
      const csvRows = Object.entries(byType).map(([type, count]) => `${type},,,${count}`).join('\n');
      const csvContent = [csvHeader, ...csvRows.split('\n')].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.csv"`,
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
        return NextResponse.json({ error: 'Forbidden: MANAGER role required' }, { status: 403 });
      }
    }
    console.error('GET /api/reports/compliance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
