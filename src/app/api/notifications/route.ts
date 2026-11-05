import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { canViewTask, canViewAlert } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const notificationQuerySchema = z.object({
  unreadOnly: z.string().optional().transform((v) => v === 'true'),
  type: z.string().optional(),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const parsed = notificationQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { unreadOnly, type, page, limit } = parsed.data;
    const userId = user.id;

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) where.read = false;
    if (type) where.type = type;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    // Filter notifications based on department scope
    const filteredNotifications = [];
    for (const notif of notifications) {
      let hasAccess = false;
      
      if (notif.taskId) {
        const task = await prisma.task.findUnique({
          where: { id: notif.taskId },
          select: { departmentId: true, originDepartmentId: true, assigneeId: true, creatorId: true },
        });
        if (task && canViewTask(user, task)) hasAccess = true;
      } else if (notif.alertId) {
        const alert = await prisma.alert.findUnique({
          where: { id: notif.alertId },
          select: { departmentId: true, ownerId: true, createdById: true },
        });
        if (alert && canViewAlert(user, alert)) hasAccess = true;
      } else {
        // Notifications without task/alert reference (system notifications)
        hasAccess = true;
      }
      
      if (hasAccess) filteredNotifications.push(notif);
    }

    return NextResponse.json({
      notifications: filteredNotifications,
      pagination: { page, limit, total: filteredNotifications.length, totalPages: Math.ceil(filteredNotifications.length / limit) },
      unreadCount,
    });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const res = await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ updated: res.count });
  } catch (error) {
    console.error('POST /api/notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}