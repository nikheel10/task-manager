import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminUsersContent } from './_components/admin-users-content';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  return <AdminUsersContent user={session.user} />;
}

