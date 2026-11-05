import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TaskForm } from '../_components/task-form';

export const dynamic = 'force-dynamic';

export default async function NewTaskPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return (
    <TaskForm
      userRole={session.user.role as string}
      userDepartmentId={session.user.departmentId as string | null}
    />
  );
}
