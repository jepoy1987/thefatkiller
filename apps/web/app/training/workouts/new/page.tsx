import { AppShell } from '../../../../components/layout/app-shell';
import { PageHeader } from '../../../../components/ui/headings';
import { WorkoutEditor } from '../../../../features/training/editors';
import { getExerciseLibrary, requireTrainingAccess } from '../../../../lib/data/training';
import { createClient } from '../../../../lib/data/client';
import { getProfile } from '../../../../lib/data/profile';
import { redirect } from 'next/navigation';
import Link from 'next/link';
export default async function NewWorkoutPage() {
  const supabase = createClient(); const access = await requireTrainingAccess(supabase);
  if (!access.allowed) redirect('/training');
  const [exercises, profile] = await Promise.all([getExerciseLibrary(), getProfile(supabase, access.user.id)]);
  return <AppShell active="training"><div className="grid max-w-3xl gap-5"><Link href="/training" className="text-sm text-primary">← Training</Link><PageHeader title="Create workout" description="Choose exercises, set targets, and arrange their order." /><WorkoutEditor exercises={exercises} units={profile.unit_system} /></div></AppShell>;
}
