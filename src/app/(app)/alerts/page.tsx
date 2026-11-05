import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AlertsContent } from './_components/alerts-content';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <AlertsContent user={session.user} />;
}
