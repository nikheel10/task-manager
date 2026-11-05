import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission, canApproveRegistration } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createNotification } from '@/lib/notifications';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'PENDING';

    if (!canApproveRegistration(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let where: Record<string, unknown> = {};
    if (user.role === 'MANAGER') {
      where.departmentId = user.departmentId;
    }
    // SUPER_ADMIN and MD can see all (or filter by department if provided)
    if (statusFilter) {
      where.status = statusFilter;
    }

    const registrations = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        role: true,
        status: true,
        departmentId: true,
        requestedAt: true,
        rejectionReason: true,
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return NextResponse.json({ registrations });
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
