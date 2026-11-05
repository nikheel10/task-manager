import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requirePermission } from '@/lib/rbac';
import { taskScopeWhere, canViewTask, canEditTask, canDeleteTask, canAssign, isGlobalViewer, canWrite } from '@/lib/access';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';
import { taskCreateSchema as createTaskSchema, taskQuerySchema } from '@/lib/validators';
import { formatTaskNumber, UPCOMING_DEADLINE_DAYS } from '@/lib/task-rules';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const parsed = taskQuerySchema.safeParse(Object.fromEntries(searchParams));

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { search, assigneeId, status, priority, categoryId, projectId, milestoneId, departmentId, overdueOnly, upcomingOnly, unassigned, page, limit } = parsed.data;
    
    // Only global viewers can filter by departmentId
    const effectiveDepartmentId = isGlobalViewer(user) ? departmentId : undefined;

    // Apply department scope first - user filters cannot override scope
    const where: Record<string, unknown> = {
      deletedAt: null,
      ...taskScopeWhere(user, effectiveDepartmentId),
    };

    if (search) {
      const taskNum = parseInt(search.replace(/^TSK-?/i, ''), 10);
      const isTaskNum = !isNaN(taskNum);
      const existingOR = where.OR ? Array.isArray(where.OR) ? where.OR : [where.OR] : [];
      where.OR = [
        ...existingOR,
        { title: { contains: search, mode: 'insensitive' } },
        ...(isTaskNum ? [{ taskNumber: taskNum }] : []),
        { assignee: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (assigneeId) where.assigneeId = assigneeId;
    if (unassigned) where.assigneeId = null;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;
    if (projectId) where.projectId = projectId;
    if (milestoneId) where.milestoneId = milestoneId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (overdueOnly) {
      where.dueDate = { lt: today };
      where.status = { notIn: ['COMPLETED', 'CLOSED'] };
    }

    if (upcomingOnly) {
      const upcoming = new Date(today);
      upcoming.setDate(upcoming.getDate() + UPCOMING_DEADLINE_DAYS);
      where.dueDate = { gte: today, lte: upcoming };
      where.status = { notIn: ['COMPLETED', 'CLOSED'] };
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, email: true, departmentId: true } },
          creator: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, name: true } },
          milestone: { select: { id: true, name: true, phaseName: true } },
          category: { select: { id: true, name: true } },
          verifier: { select: { id: true, name: true } },
          _count: { select: { comments: true, checklist: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    const tasksWithFlags = tasks.map((task) => ({
      ...task,
      taskNumberDisplay: formatTaskNumber(task.taskNumber),
      isOverdue: task.dueDate < today && !['COMPLETED', 'CLOSED'].includes(task.status),
      isUpcoming: (() => {
        const due = new Date(task.dueDate);
        return due >= today && due <= new Date(today.getTime() + UPCOMING_DEADLINE_DAYS * 86400000) && !['COMPLETED', 'CLOSED'].includes(task.status);
      })(),
    }));

    return NextResponse.json({
      tasks: tasksWithFlags,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(canWrite);
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, assigneeId, priority, dueDate, type, categoryId, projectId, milestoneId, estimatedHours } = parsed.data;

    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, name: true, email: true, role: true, isActive: true, departmentId: true },
    });

    if (!assignee || !assignee.isActive) {
      return NextResponse.json(
        { error: 'Assignee not found or inactive', fieldErrors: { assigneeId: ['Assignee not found or inactive'] } },
        { status: 400 }
      );
    }

    if (!['TEAM_MEMBER', 'MANAGER'].includes(assignee.role)) {
      return NextResponse.json(
        { error: 'Assignee must be a Team Member or Manager', fieldErrors: { assigneeId: ['Assignee must be a Team Member or Manager'] } },
        { status: 400 }
      );
    }

    // Permission check: can this user assign to this assignee?
    if (!canAssign(user, assignee as any)) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot assign to this user', fieldErrors: { assigneeId: ['Cannot assign to this user'] } },
        { status: 403 }
      );
    }

    if (categoryId) {
      const category = await prisma.taskCategory.findUnique({ where: { id: categoryId } });
      if (!category || !category.active) {
        return NextResponse.json(
          { error: 'Category not found or inactive', fieldErrors: { categoryId: ['Category not found or inactive'] } },
          { status: 400 }
        );
      }
    }

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || !project.isActive) {
        return NextResponse.json(
          { error: 'Project not found or inactive', fieldErrors: { projectId: ['Project not found or inactive'] } },
          { status: 400 }
        );
      }
    }

    if (milestoneId) {
      const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found', fieldErrors: { milestoneId: ['Milestone not found'] } },
          { status: 400 }
        );
      }
      if (projectId && milestone.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Milestone does not belong to the selected project', fieldErrors: { milestoneId: ['Milestone does not belong to the selected project'] } },
          { status: 400 }
        );
      }
    }

    const creatorDeptId = user.departmentId;
    const assigneeDeptId = assignee.departmentId;
    const taskDeptId = assigneeDeptId ?? creatorDeptId;
    const isCrossDept = assigneeDeptId !== null && creatorDeptId !== null && assigneeDeptId !== creatorDeptId;

    // Validate category belongs to the task's department
    if (categoryId) {
      const category = await prisma.taskCategory.findUnique({ where: { id: categoryId } });
      if (!category || !category.active) {
        return NextResponse.json(
          { error: 'Category not found or inactive', fieldErrors: { categoryId: ['Category not found or inactive'] } },
          { status: 400 }
        );
      }
      if (category.departmentId !== taskDeptId) {
        return NextResponse.json(
          { error: 'Category does not belong to this department', fieldErrors: { categoryId: ['Invalid category for this department'] } },
          { status: 400 }
        );
      }
    }

    // Validate project belongs to the task's department
    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || !project.isActive) {
        return NextResponse.json(
          { error: 'Project not found or inactive', fieldErrors: { projectId: ['Project not found or inactive'] } },
          { status: 400 }
        );
      }
      if (project.departmentId !== taskDeptId) {
        return NextResponse.json(
          { error: 'Project does not belong to this department', fieldErrors: { projectId: ['Invalid project for this department'] } },
          { status: 400 }
        );
      }
    }

    if (milestoneId) {
      const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
      if (!milestone) {
        return NextResponse.json(
          { error: 'Milestone not found', fieldErrors: { milestoneId: ['Milestone not found'] } },
          { status: 400 }
        );
      }
      if (projectId && milestone.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Milestone does not belong to the selected project', fieldErrors: { milestoneId: ['Milestone does not belong to the selected project'] } },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        assigneeId,
        creatorId: user.id,
        departmentId: taskDeptId,
        originDepartmentId: creatorDeptId,
        parentTaskId: null,
        isCrossDepartment: isCrossDept,
        priority,
        dueDate: new Date(dueDate),
        type: type ?? 'TASK',
        categoryId,
        projectId,
        milestoneId,
        estimatedHours,
        status: 'NOT_STARTED',
        percentComplete: 0,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, name: true, phaseName: true } },
        category: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      action: 'CREATE',
      entity: 'Task',
      entityId: task.id,
      userId: user.id,
      taskId: task.id,
      newData: { title, assigneeId, priority, dueDate, status: 'NOT_STARTED', categoryId, projectId, milestoneId, departmentId: task.departmentId, originDepartmentId: task.originDepartmentId },
    });

    await createNotification({
      userId: assigneeId,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned to task "${task.title}" (${formatTaskNumber(task.taskNumber)})`,
      metadata: { taskId: task.id, taskNumber: task.taskNumber },
      taskId: task.id,
    });

    return NextResponse.json({ ...task, taskNumberDisplay: formatTaskNumber(task.taskNumber) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden: Manager role required' }, { status: 403 });
      }
    }
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}