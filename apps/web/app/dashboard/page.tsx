import Link from 'next/link';
import { logout } from '../actions';
import { requireProfile } from '../../lib/auth';

export default async function DashboardPage() {
  const { user, profile } = await requireProfile();
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-4xl font-bold">Welcome, {profile.display_name ?? profile.first_name ?? 'there'}</h1>
        <p className="mt-4 text-slate-600">Your TFK account is ready.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-100 p-4">Email: {user.email}</div>
          <div className="rounded-xl bg-slate-100 p-4">Display name: {profile.display_name ?? 'Not set'}</div>
          <div className="rounded-xl bg-slate-100 p-4">Unit system: {profile.unit_system}</div>
          <div className="rounded-xl bg-slate-100 p-4">Onboarding: {profile.onboarding_completed ? 'Complete' : 'Incomplete'}</div>
        </div>
        <p className="mt-8 text-xl font-semibold">Today&apos;s Dashboard</p>
        <p className="mt-2 text-slate-600">Coming in Sprint 2.</p>
        <div className="mt-8 flex gap-4"><Link href="/settings/profile">Profile settings</Link><form action={logout}><button type="submit">Log out</button></form></div>
      </div>
    </main>
  );
}
