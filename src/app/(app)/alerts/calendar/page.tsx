import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CalendarContent } from './_components/calendar-content';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <CalendarContent user={session.user} />;
}
