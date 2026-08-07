import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getDashboardPath } from '@/lib/permissions';

export default async function Home() {
  const user = await getSession();
  if (user) {
    redirect(getDashboardPath(user.role));
  }
  redirect('/login');
}
