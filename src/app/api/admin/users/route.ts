import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission, canManageUsers, isGlobalRole } from '@/lib/rbac';
import { userScopeWhere } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { userCreateSchema as createUserSchema } from '@/lib/validators';
import bcrypt from 'bcryptjs';

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'MD', 'MANAGER', 'TEAM_MEMBER', 'VIEWER']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
  departmentId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {
      ...userScopeWhere(user),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true, createdAt: true, isComplianceOwner: true },
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
    const user = await requirePermission(canManageUsers);
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, role, isActive, password, departmentId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already in use', fieldErrors: { email: ['Email already in use'] } },
        { status: 409 }
      );
    }

    // SUPER_ADMIN and MD must have null departmentId
    // MANAGER, TEAM_MEMBER, VIEWER must have a departmentId
    const resolvedDeptId = (role === 'SUPER_ADMIN' || role === 'MD') ? null : departmentId;

    if ((role === 'MANAGER' || role === 'TEAM_MEMBER' || role === 'VIEWER') && !resolvedDeptId) {
      return NextResponse.json(
        { error: 'Department is required for this role', fieldErrors: { departmentId: ['Department is required'] } },
        { status: 400 }
      );
    }

    // Verify department exists and is active if provided
    if (resolvedDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: resolvedDeptId } });
      if (!dept || !dept.active) {
        return NextResponse.json(
          { error: 'Department not found or inactive', fieldErrors: { departmentId: ['Department not found or inactive'] } },
          { status: 400 }
        );
      }
    }

    const hashedPassword = password ? await bcrypt.hash(password, 12) : await bcrypt.hash('TempPass123!', 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        isActive: isActive ?? true,
        passwordHash: hashedPassword,
        departmentId: resolvedDeptId,
      },
      select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true, createdAt: true, isComplianceOwner: true },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
      }
    }
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
