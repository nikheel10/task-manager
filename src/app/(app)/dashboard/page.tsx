import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardContent } from './_components/dashboard-content';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <DashboardContent user={session.user} />;
}
