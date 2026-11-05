import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, isGlobalViewer } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  isActive: z.boolean().optional(),
  departmentId: z.string().optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();

    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        milestones: {
          include: {
            _count: { select: { tasks: true } },
          },
          orderBy: { dueDate: 'asc' },
        },
        _count: { select: { tasks: true, milestones: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!isGlobalViewer(user) && project.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('MANAGER');

    const { id } = await params;
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existingProject = await prisma.project.findUnique({ where: { id } });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!isGlobalViewer(user) && existingProject.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { departmentId, ...rest } = parsed.data;
    const resolvedDeptId = departmentId ?? existingProject.departmentId;

    if (resolvedDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: resolvedDeptId } });
      if (!dept || !dept.active) {
        return NextResponse.json(
          { error: 'Department not found or inactive', fieldErrors: { departmentId: ['Department not found or inactive'] } },
          { status: 400 }
        );
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: { ...rest, departmentId: resolvedDeptId },
      include: { _count: { select: { tasks: true, milestones: true } }, department: { select: { id: true, name: true, code: true } } },
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'Project',
      entityId: project.id,
      userId: user.id,
      oldData: { name: existingProject.name, description: existingProject.description, isActive: existingProject.isActive },
      newData: { name: project.name, description: project.description, isActive: project.isActive },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('PATCH /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('MANAGER');

    const { id } = await params;

    const existingProject = await prisma.project.findUnique({ where: { id } });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!isGlobalViewer(user) && existingProject.departmentId !== user.departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.project.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'Project',
      entityId: id,
      userId: user.id,
      oldData: { name: existingProject.name, description: existingProject.description },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
