import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DepartmentsContent } from './_components/departments-content';

export const dynamic = 'force-dynamic';

export default async function AdminDepartmentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  return <DepartmentsContent user={session.user} />;
}
