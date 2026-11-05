import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission, canManageDepartments, isGlobalViewer } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';

const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name too long'),
  code: z.string().trim().toUpperCase().min(2, 'Code must be at least 2 characters').max(10, 'Code too long').regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and numbers only'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const departments = await prisma.department.findMany({
      where: isGlobalViewer(user) ? {} : { active: true },
      select: { id: true, name: true, code: true, active: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ departments });
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
    const user = await requirePermission(canManageDepartments);
    const body = await request.json();
    const parsed = departmentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, code } = parsed.data;

    const existing = await prisma.department.findFirst({
      where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { code }] },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Department already exists', fieldErrors: existing.name === name ? { name: ['Department name already exists'] } : { code: ['Department code already exists'] } },
        { status: 409 }
      );
    }

    const department = await prisma.department.create({
      data: { name, code, createdById: user.id },
      select: { id: true, name: true, code: true, active: true },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Department',
      entityId: department.id,
      userId: user.id,
      newData: { name, code },
    });

    return NextResponse.json(department, { status: 201 });
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
