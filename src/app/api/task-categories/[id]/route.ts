import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requirePermission, canManageDepartments } from '@/lib/rbac';
import { z } from 'zod';

const updateTaskCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const category = await prisma.taskCategory.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('GET /api/task-categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(canManageDepartments);
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTaskCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.taskCategory.findUnique({ where: { id } });
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check for duplicate name if name is being changed
    if (parsed.data.name && parsed.data.name !== existingCategory.name) {
      const duplicate = await prisma.taskCategory.findFirst({
        where: { name: parsed.data.name, departmentId: existingCategory.departmentId },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Category already exists', fieldErrors: { name: ['Category with this name already exists'] } },
          { status: 400 }
        );
      }
    }

    const category = await prisma.taskCategory.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { tasks: true } } },
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'TaskCategory',
      entityId: category.id,
      userId: session.id,
      oldData: { name: existingCategory.name, active: existingCategory.active, sortOrder: existingCategory.sortOrder },
      newData: { name: category.name, active: category.active, sortOrder: category.sortOrder },
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('PATCH /api/task-categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(canManageDepartments);
    const { id } = await params;

    const existingCategory = await prisma.taskCategory.findUnique({ where: { id } });
    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category has tasks
    const taskCount = await prisma.task.count({ where: { categoryId: id } });
    if (taskCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with associated tasks', fieldErrors: { id: [`Category has ${taskCount} associated tasks`] } },
        { status: 400 }
      );
    }

    await prisma.taskCategory.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'TaskCategory',
      entityId: id,
      userId: session.id,
      oldData: { name: existingCategory.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
      }
    }
    console.error('DELETE /api/task-categories/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}