import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ELIGIBLE_ASSIGNEE_ROLES } from '@/lib/task-rules';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role as string;
    const roleHierarchy: Record<string, number> = {
      SUPER_ADMIN: 4,
      MANAGER: 3,
      TEAM_MEMBER: 2,
      VIEWER: 1,
    };

    if ((roleHierarchy[userRole] ?? 0) < roleHierarchy['MANAGER']) {
      return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [...ELIGIBLE_ASSIGNEE_ROLES] },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('GET /api/users/eligible error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}