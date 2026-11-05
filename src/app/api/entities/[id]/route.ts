import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireRole } from '@/lib/rbac';
import { updateEntitySchema } from '@/lib/validators/task';

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
    const entity = await prisma.entity.findUnique({
      where: { id },
      include: {
        alerts: {
          where: { deletedAt: null },
          select: { id: true, title: true, status: true, type: true, dueDate: true },
          orderBy: { dueDate: 'asc' },
        },
        _count: { select: { alerts: true } },
      },
    });

    if (!entity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    return NextResponse.json(entity);
  } catch (error) {
    console.error('GET /api/entities/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('MANAGER');
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEntitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existingEntity = await prisma.entity.findUnique({ where: { id } });
    if (!existingEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    const entity = await prisma.entity.update({
      where: { id },
      data: parsed.data,
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'Entity',
      entityId: id,
      userId: session.id,
      oldData: { name: existingEntity.name, type: existingEntity.type, jurisdiction: existingEntity.jurisdiction, isActive: existingEntity.isActive },
      newData: { name: entity.name, type: entity.type, jurisdiction: entity.jurisdiction, isActive: entity.isActive },
    });

    return NextResponse.json(entity);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('PATCH /api/entities/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole('MANAGER');
    const { id } = await params;

    const existingEntity = await prisma.entity.findUnique({ where: { id } });
    if (!existingEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    await prisma.entity.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'Entity',
      entityId: id,
      userId: session.id,
      oldData: { name: existingEntity.name, type: existingEntity.type },
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
    console.error('DELETE /api/entities/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}