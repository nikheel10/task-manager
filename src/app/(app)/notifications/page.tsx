import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NotificationsContent } from './_components/notifications-content';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <NotificationsContent user={session.user} />;
}
