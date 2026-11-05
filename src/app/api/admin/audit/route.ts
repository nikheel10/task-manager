import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission, canManageSettings } from '@/lib/rbac';
import { isGlobalViewer } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const auditQuerySchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('50').transform(Number),
  export: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Only SUPER_ADMIN, MD, and users with global access can view audit logs
    if (!isGlobalViewer(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = auditQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { entity, entityId, userId, action, dateFrom, dateTo, page, limit, export: exportCsv } = parsed.data;

    // Apply department scope for audit logs
    const where: Record<string, unknown> = {};
    
    // For non-SUPER_ADMIN global viewers, filter by department
    if (user.role !== 'SUPER_ADMIN' && user.departmentId) {
      // Get all entity IDs in user's department
      const [taskIds, alertIds, projectIds] = await Promise.all([
        prisma.task.findMany({ where: { departmentId: user.departmentId }, select: { id: true } }),
        prisma.alert.findMany({ where: { departmentId: user.departmentId }, select: { id: true } }),
        prisma.project.findMany({ where: { departmentId: user.departmentId }, select: { id: true } }),
      ]);
      
      const taskIdList = taskIds.map(t => t.id);
      const alertIdList = alertIds.map(a => a.id);
      const projectIdList = projectIds.map(p => p.id);
      
      where.OR = [
        { taskId: { in: taskIdList } },
        { alertId: { in: alertIdList } },
        { projectId: { in: projectIdList } },
        { entity: 'User', userId: { in: [] } }, // Will be filtered by user department
      ];
    }

    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo);
    }

    if (exportCsv === 'csv') {
      const entries = await prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const csvHeader = 'ID,Action,Entity,Entity ID,User ID,User Name,User Email,Task ID,Alert ID,Old Data,New Data,Metadata,Created At';
      const csvRows = entries.map((e) => [
        e.id,
        e.action,
        e.entity,
        e.entityId,
        e.userId,
        e.user?.name || '',
        e.user?.email || '',
        e.taskId || '',
        e.alertId || '',
        JSON.stringify(e.oldData || ''),
        JSON.stringify(e.newData || ''),
        JSON.stringify(e.metadata || ''),
        e.createdAt.toISOString(),
      ].join(','));

      const csvContent = [csvHeader, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          task: { select: { id: true, title: true, taskNumber: true } },
          alert: { select: { id: true, title: true, alertNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      entries,
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
    console.error('GET /api/admin/audit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}