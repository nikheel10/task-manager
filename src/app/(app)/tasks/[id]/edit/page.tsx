import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TaskForm } from '../../_components/task-form';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      departmentId: true,
      categoryId: true,
      title: true,
      description: true,
      assigneeId: true,
      priority: true,
      dueDate: true,
      type: true,
      estimatedHours: true,
      projectId: true,
      milestoneId: true,
      status: true,
      originDepartmentId: true,
    },
  });

  if (!task) {
    redirect('/tasks');
  }

  return (
    <TaskForm
      taskId={id}
      userRole={session.user.role as string}
      userDepartmentId={session.user.departmentId as string | null}
      initialData={{
        title: task.title,
        description: task.description,
        assigneeId: task.assigneeId,
        priority: task.priority,
        dueDate: task.dueDate.toISOString().split('T')[0],
        type: task.type,
        estimatedHours: task.estimatedHours ?? undefined,
        projectId: task.projectId,
        milestoneId: task.milestoneId,
        categoryId: task.categoryId,
        departmentId: task.departmentId,
      }}
    />
  );
}
