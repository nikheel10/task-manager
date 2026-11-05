import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireRole } from '@/lib/rbac';
import { z } from 'zod';

const milestoneSchema = z.object({
  name: z.string().trim().min(1, 'Milestone name is required').max(200),
  phaseName: z.string().trim().max(100).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  projectId: z.string().min(1, 'Project is required'),
});

const updateMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phaseName: z.string().trim().max(100).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, 'At least one field must be provided');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const [milestones, total] = await Promise.all([
      prisma.milestone.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.milestone.count({ where }),
    ]);

    return NextResponse.json({
      milestones,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/milestones error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('MANAGER');
    const body = await request.json();
    const parsed = milestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, phaseName, dueDate, projectId } = parsed.data;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found', fieldErrors: { projectId: ['Project not found'] } },
        { status: 400 }
      );
    }

    const milestone = await prisma.milestone.create({
      data: {
        name,
        phaseName,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Milestone',
      entityId: milestone.id,
      userId: session.id,
      newData: { name, phaseName, dueDate, projectId },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('POST /api/milestones error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}