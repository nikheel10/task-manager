import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { requireRole } from '@/lib/rbac';
import { z } from 'zod';

const updateMilestoneSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phaseName: z.string().trim().max(100).optional().nullable(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
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
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { dueDate: 'asc' },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('GET /api/milestones/[id] error:', error);
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
    const parsed = updateMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existingMilestone = await prisma.milestone.findUnique({ where: { id } });
    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : parsed.data.dueDate,
      },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });

    await createAuditLog({
      action: 'UPDATE',
      entity: 'Milestone',
      entityId: milestone.id,
      userId: session.id,
      oldData: { name: existingMilestone.name, phaseName: existingMilestone.phaseName, dueDate: existingMilestone.dueDate?.toISOString() },
      newData: { name: milestone.name, phaseName: milestone.phaseName, dueDate: milestone.dueDate?.toISOString() },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('PATCH /api/milestones/[id] error:', error);
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

    const existingMilestone = await prisma.milestone.findUnique({ where: { id } });
    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    await prisma.milestone.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entity: 'Milestone',
      entityId: id,
      userId: session.id,
      oldData: { name: existingMilestone.name, phaseName: existingMilestone.phaseName, dueDate: existingMilestone.dueDate?.toISOString() },
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
    console.error('DELETE /api/milestones/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}