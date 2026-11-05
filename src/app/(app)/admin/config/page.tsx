import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminConfigContent } from './_components/admin-config-content';

export const dynamic = 'force-dynamic';

export default async function AdminConfigPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  return <AdminConfigContent user={session.user} />;
}
