import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AutomationContent } from './_components/automation-content';

export const dynamic = 'force-dynamic';

export default async function AutomationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  return <AutomationContent user={session.user} />;
}
