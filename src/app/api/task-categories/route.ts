import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireAuth, requirePermission, canManageDepartments } from '@/lib/rbac';
import { taskCategorySchema } from '@/lib/validators/task';
import { isGlobalViewer } from '@/lib/access';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};
    if (isActive !== null && isActive !== undefined) {
      where.active = isActive === 'true';
    }

    // Department-scoped access control
    const requestedDeptId = departmentId || user.departmentId;

    if (!requestedDeptId) {
      // Global roles (SUPER_ADMIN/MD) must send departmentId
      if (!isGlobalViewer(user)) {
        return NextResponse.json({ error: 'Forbidden: departmentId is required' }, { status: 403 });
      }
      // Return all active categories for global viewers without department filter
    } else {
      // Verify access to this department
      if (!isGlobalViewer(user)) {
        if (user.departmentId !== requestedDeptId) {
          return NextResponse.json({ error: 'Forbidden: Cannot view categories of another department' }, { status: 403 });
        }
      }
      where.departmentId = requestedDeptId;
    }

    const [categories, total] = await Promise.all([
      prisma.taskCategory.findMany({
        where,
        include: { _count: { select: { tasks: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.taskCategory.count({ where }),
    ]);

    return NextResponse.json({
      categories,
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
    console.error('GET /api/task-categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(canManageDepartments);
    const body = await request.json();
    const parsed = taskCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.taskCategory.findFirst({
      where: { name: parsed.data.name, departmentId: parsed.data.departmentId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category already exists', fieldErrors: { name: ['Category with this name already exists'] } },
        { status: 409 }
      );
    }

    const category = await prisma.taskCategory.create({
      data: parsed.data,
      include: { _count: { select: { tasks: true } } },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'TaskCategory',
      entityId: category.id,
      userId: session.id,
      newData: parsed.data,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
      }
    }
    console.error('POST /api/task-categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}