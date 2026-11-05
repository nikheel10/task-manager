import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsContent } from './_components/settings-content';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <SettingsContent user={session.user} />;
}
