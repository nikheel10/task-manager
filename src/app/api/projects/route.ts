import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, isGlobalViewer } from '@/lib/rbac';
import { projectScopeWhere } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const projectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  isActive: z.boolean().default(true),
  departmentId: z.string().optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
  departmentId: z.string().optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {
      ...projectScopeWhere(user),
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          _count: { select: { tasks: true, milestones: true } },
          department: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects,
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
    console.error('GET /api/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRole('MANAGER');
    const body = await request.json();
    const parsed = projectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, isActive, departmentId } = parsed.data;

    const resolvedDeptId = departmentId ?? user.departmentId;

    if (resolvedDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: resolvedDeptId } });
      if (!dept || !dept.active) {
        return NextResponse.json(
          { error: 'Department not found or inactive', fieldErrors: { departmentId: ['Department not found or inactive'] } },
          { status: 400 }
        );
      }
    }

    const project = await prisma.project.create({
      data: { name, description, isActive, departmentId: resolvedDeptId },
      include: { _count: { select: { tasks: true, milestones: true } }, department: { select: { id: true, name: true, code: true } } },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Project',
      entityId: project.id,
      userId: user.id,
      newData: { name, description, isActive, departmentId: resolvedDeptId },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('POST /api/projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
