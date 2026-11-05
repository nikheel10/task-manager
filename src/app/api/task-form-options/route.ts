import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission, canWrite } from '@/lib/rbac';
import { canAssign, isGlobalViewer } from '@/lib/access';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    if (!departmentId) {
      return NextResponse.json({ error: 'departmentId is required' }, { status: 400 });
    }

    // TEAM_MEMBER and VIEWER cannot access task form options
    if (user.role === 'TEAM_MEMBER' || user.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true, code: true, active: true },
    });

    if (!dept || !dept.active) {
      return NextResponse.json({ error: 'Department not found or inactive' }, { status: 404 });
    }

    // Get categories for this department
    const categories = await prisma.taskCategory.findMany({
      where: { departmentId, active: true },
      select: { id: true, name: true, code: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // Get projects for this department
    const projects = await prisma.project.findMany({
      where: { departmentId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Get assignees based on user role and department
    let assignees: Array<{ id: string; name: string; employeeId: string | null; role: string; departmentName: string | null }> = [];

    if (user.role === 'SUPER_ADMIN') {
      // Can assign to any MANAGER or TEAM_MEMBER of the selected department
      const users = await prisma.user.findMany({
        where: {
          departmentId,
          status: 'ACTIVE',
          isActive: true,
          role: { in: ['MANAGER', 'TEAM_MEMBER'] },
        },
        select: { id: true, name: true, employeeId: true, role: true },
      });
      assignees = users.map((u) => ({ id: u.id, name: u.name ?? '', employeeId: u.employeeId, role: u.role, departmentName: dept.name }));
    } else if (user.role === 'MD') {
      // Can assign to any MANAGER (cross-department)
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          isActive: true,
          role: 'MANAGER',
        },
        select: { id: true, name: true, employeeId: true, role: true, department: { select: { name: true } } },
      });
      assignees = users.map((u) => ({ id: u.id, name: u.name ?? '', employeeId: u.employeeId, role: u.role, departmentName: u.department?.name ?? null }));
    } else if (user.role === 'MANAGER') {
      if (departmentId === user.departmentId) {
        // Own department: TEAM_MEMBERS only (cannot assign to own-department managers)
        const users = await prisma.user.findMany({
          where: {
            departmentId,
            status: 'ACTIVE',
            isActive: true,
            role: 'TEAM_MEMBER',
          },
          select: { id: true, name: true, employeeId: true, role: true },
        });
        assignees = users.map((u) => ({ id: u.id, name: u.name ?? '', employeeId: u.employeeId, role: u.role, departmentName: dept.name }));
      } else {
        // Cross-department: only MANAGERs of that department
        const users = await prisma.user.findMany({
          where: {
            departmentId,
            status: 'ACTIVE',
            isActive: true,
            role: 'MANAGER',
          },
          select: { id: true, name: true, employeeId: true, role: true },
        });
        assignees = users.map((u) => ({ id: u.id, name: u.name ?? '', employeeId: u.employeeId, role: u.role, departmentName: dept.name }));
      }
    }

    return NextResponse.json({
      department: dept,
      categories,
      projects,
      assignees,
    });
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
