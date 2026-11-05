import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AlertForm } from '../../_components/alert-form';

export const dynamic = 'force-dynamic';

export default async function EditAlertPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  const { id } = await params;
  return <AlertForm user={session.user} alertId={id} />;
}
