import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EntitiesContent } from './_components/entities-content';

export const dynamic = 'force-dynamic';

export default async function EntitiesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <EntitiesContent user={session.user} />;
}
