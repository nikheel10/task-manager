import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { RegistrationsContent } from './_components/registrations-content';

export const dynamic = 'force-dynamic';

interface RegistrationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RegistrationsPage({ searchParams }: RegistrationsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { isGlobalViewer } = await import('@/lib/access');
  const isGlobal = isGlobalViewer(session.user as any);

  if (!isGlobal && session.user.role !== 'MANAGER') {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const statusFilter = typeof params.status === 'string' ? params.status : 'PENDING';

  return <RegistrationsContent user={session.user} statusFilter={statusFilter} />;
}
