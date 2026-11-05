import { prisma } from '@/lib/prisma';

export async function syncTaskProgress(taskId: string) {
  const items = await prisma.taskChecklist.findMany({
    where: { taskId },
    select: { completed: true, isMandatory: true },
  });

  if (items.length === 0) {
    return null;
  }

  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const percentComplete = Math.round((completed / total) * 100);

  const allMandatoryDone = items
    .filter((i) => i.isMandatory)
    .every((i) => i.completed);

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });

  if (!existingTask) {
    return null;
  }

  const updateData: Record<string, unknown> = { percentComplete };

  if (allMandatoryDone && completed === total) {
    updateData.status = 'COMPLETED';
  } else if (existingTask.status === 'COMPLETED') {
    updateData.status = 'IN_PROGRESS';
  }

  await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });

  return { percentComplete, allComplete: allMandatoryDone && completed === total };
}
