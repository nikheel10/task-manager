import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission, canManageDepartments } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';

const departmentUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long').optional(),
  code: z.string().trim().toUpperCase().min(2, 'Code must be at least 2 characters').max(10, 'Code too long').regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only').optional(),
  active: z.boolean().optional(),
  hasGlobalAccess: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission(canManageDepartments);
    const { id } = await params;
    const body = await request.json();
    const parsed = departmentUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // If deactivating, check for active users or open tasks/alerts
    if (parsed.data.active === false) {
      const [userCount, taskCount, alertCount] = await Promise.all([
        prisma.user.count({ where: { departmentId: id, isActive: true } }),
        prisma.task.count({ where: { departmentId: id, deletedAt: null, status: { notIn: ['CLOSED', 'COMPLETED'] } } }),
        prisma.alert.count({ where: { departmentId: id, deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      ]);
      if (userCount > 0 || taskCount > 0 || alertCount > 0) {
        return NextResponse.json(
          {
            error: 'Cannot deactivate department with active users or open tasks/alerts',
            fieldErrors: {
              active: [`Department has ${userCount} active user(s), ${taskCount} open task(s), and ${alertCount} open alert(s). Reassign or close them first.`],
            },
          },
          { status: 409 }
        );
      }
    }

    // Check name/code uniqueness if changed
    if (parsed.data.name || parsed.data.code) {
      const conditions: Record<string, unknown>[] = [];
      if (parsed.data.name) {
        conditions.push({ name: { equals: parsed.data.name, mode: 'insensitive' as const } });
      }
      if (parsed.data.code) {
        conditions.push({ code: parsed.data.code });
      }
      const duplicate = await prisma.department.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { OR: conditions },
          ],
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Department already exists', fieldErrors: { name: ['Department name or code already exists'] } },
          { status: 409 }
        );
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, code: true, active: true, hasGlobalAccess: true },
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'Department',
      entityId: department.id,
      userId: user.id,
      oldData: { name: existing.name, code: existing.code, active: existing.active, hasGlobalAccess: existing.hasGlobalAccess },
      newData: { name: department.name, code: department.code, active: department.active, hasGlobalAccess: department.hasGlobalAccess },
    });

    return NextResponse.json(department);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
