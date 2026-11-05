import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AlertForm } from '../_components/alert-form';

export const dynamic = 'force-dynamic';

export default async function NewAlertPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <AlertForm user={session.user} />;
}
