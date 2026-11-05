import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/rbac';
import { regulatoryTemplateSchema } from '@/lib/validators/task';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { regulatoryClause: { contains: search, mode: 'insensitive' } },
        { jurisdiction: { contains: search, mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.regulatoryTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('GET /api/regulatory-templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('MANAGER');
    const body = await request.json();
    const parsed = regulatoryTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, type, jurisdiction, assetType, regulatoryClause, defaultRecurrence, defaultLeadDays, isActive } = parsed.data;

    const template = await prisma.regulatoryTemplate.create({
      data: {
        title,
        type,
        jurisdiction,
        assetType,
        regulatoryClause,
        defaultRecurrence,
        defaultLeadDays,
        isActive,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('POST /api/regulatory-templates error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}