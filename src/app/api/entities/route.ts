import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireRole } from '@/lib/rbac';
import { entitySchema, updateEntitySchema } from '@/lib/validators/task';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { jurisdiction: { contains: search, mode: 'insensitive' } },
      ];
    }

    const entities = await prisma.entity.findMany({
      where,
      include: { _count: { select: { alerts: true } } },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ entities });
  } catch (error) {
    console.error('GET /api/entities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('MANAGER');
    const body = await request.json();
    const parsed = entitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, type, jurisdiction, isActive } = parsed.data;

    const entity = await prisma.entity.create({
      data: { name, type, jurisdiction, isActive },
      include: { _count: { select: { alerts: true } } },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Entity',
      entityId: entity.id,
      userId: session.id,
      newData: { name, type, jurisdiction, isActive },
    });

    return NextResponse.json(entity, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('POST /api/entities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}