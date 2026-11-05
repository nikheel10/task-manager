import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/rbac';
import { canManageDepartmentFlag, canWrite } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createTeamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['TEAM_MEMBER', 'VIEWER']).default('TEAM_MEMBER'),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Only MANAGER, SUPER_ADMIN, MD can view team members
    if (!['SUPER_ADMIN', 'MD', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // MANAGER: only own department users
    let where: Record<string, unknown> = {};
    if (user.role === 'MANAGER') {
      if (!user.departmentId) {
        return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
      }
      where.departmentId = user.departmentId;
      where.role = { in: ['TEAM_MEMBER', 'VIEWER'] };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true, createdAt: true, employeeId: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Only MANAGER can create team members via this endpoint
    if (user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Manager only' }, { status: 403 });
    }

    if (!user.departmentId) {
      return NextResponse.json({ error: 'No department assigned' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role, isActive } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already in use', fieldErrors: { email: ['Email already in use'] } },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: 'TEAM_MEMBER',
        isActive: isActive ?? true,
        passwordHash: hashedPassword,
        departmentId: user.departmentId,
      },
      select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true, createdAt: true, employeeId: true },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager only' }, { status: 403 });
      }
    }
    console.error('POST /api/team-members error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
