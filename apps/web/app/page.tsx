import { redirect } from 'next/navigation';

import { getCurrentUser } from '../lib/data/session';

export default async function HomePage() {
  const { data: { user } } = await getCurrentUser();
  redirect(user ? '/dashboard' : '/login');
}
