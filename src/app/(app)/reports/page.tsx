import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReportsContent } from './_components/reports-content';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }
  return <ReportsContent user={session.user} />;
}
