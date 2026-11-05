import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TeamMembersContent } from './_components/team-members-content';

export const dynamic = 'force-dynamic';

export default async function TeamMembersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Only MANAGER, SUPER_ADMIN, MD can access
  if (!['SUPER_ADMIN', 'MD', 'MANAGER'].includes(session.user.role)) {
    redirect('/dashboard');
  }

  return <TeamMembersContent user={session.user} />;
}
