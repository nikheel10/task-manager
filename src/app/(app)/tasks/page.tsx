import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TasksContent } from './_components/tasks-content';

export const dynamic = 'force-dynamic';

interface TasksPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const params = await searchParams;
  const initialFilters = {
    assigneeId: typeof params.assigneeId === 'string' ? params.assigneeId : 'all',
    status: typeof params.status === 'string' ? params.status : 'all',
    priority: typeof params.priority === 'string' ? params.priority : 'all',
    categoryId: typeof params.categoryId === 'string' ? params.categoryId : 'all',
    overdueOnly: params.overdueOnly === 'true',
    upcomingOnly: params.upcomingOnly === 'true',
  };
  return <TasksContent user={session.user} initialFilters={initialFilters} />;
}
