import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = searchSchema.safeParse({ q: searchParams.get('q') });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    const { q } = parsed.data;
    const userId = session.user.id;
    const userRole = session.user.role as string;

    const searchTerm = `%${q}%`;

    // Search tasks
    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
        ...(userRole === 'VIEWER' ? { assigneeId: userId } : {}),
        ...(userRole === 'TEAM_MEMBER'
          ? { OR: [{ assigneeId: userId }, { creatorId: userId }] }
          : {}),
      },
      take: 5,
      select: { id: true, title: true, description: true, taskNumber: true },
    });

    // Search alerts
    const alerts = await prisma.alert.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { reference: { contains: q, mode: 'insensitive' } },
        ],
        ...(userRole === 'VIEWER' ? { ownerId: userId } : {}),
        ...(userRole === 'TEAM_MEMBER'
          ? { OR: [{ ownerId: userId }, { createdById: userId }] }
          : {}),
      },
      take: 5,
      select: { id: true, title: true, alertNumber: true },
    });

    // Search entities
    const entities = await prisma.entity.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      take: 5,
      select: { id: true, name: true, type: true },
    });

    const results = [
      ...tasks.map((t) => ({
        type: 'task' as const,
        id: t.id,
        title: t.title,
        subtitle: `Task #${t.taskNumber}`,
        href: `/tasks/${t.id}`,
      })),
      ...alerts.map((a) => ({
        type: 'alert' as const,
        id: a.id,
        title: a.title,
        subtitle: `Alert ALT-${String(a.alertNumber).padStart(4, '0')}`,
        href: `/alerts`,
      })),
      ...entities.map((e) => ({
        type: 'entity' as const,
        id: e.id,
        title: e.name,
        subtitle: `Entity: ${e.type}`,
        href: `/entities`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('GET /api/search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
