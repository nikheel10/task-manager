import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditContent } from './_components/audit-content';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  return <AuditContent user={session.user} />;
}

