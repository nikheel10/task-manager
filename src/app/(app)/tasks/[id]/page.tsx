import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TaskDetail } from '../_components/task-detail';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const { id } = await params;
  return <TaskDetail user={session.user} taskId={id} />;
}
