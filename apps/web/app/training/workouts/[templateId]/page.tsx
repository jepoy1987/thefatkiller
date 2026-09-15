import { AppShell } from '../../../../components/layout/app-shell';
import { PageHeader } from '../../../../components/ui/headings';
import { WorkoutEditor } from '../../../../features/training/editors';
import { getExerciseLibrary, getWorkoutTemplate, requireTrainingAccess } from '../../../../lib/data/training';
import { createClient } from '../../../../lib/data/client';
import { getProfile } from '../../../../lib/data/profile';
import { redirect } from 'next/navigation';
import Link from 'next/link';
export default async function EditWorkoutPage(props: { params: Promise<{ templateId: string }> }) {
  const params = await props.params;
  const supabase = (await createClient());const access = await requireTrainingAccess(supabase);
  if (!access.allowed) redirect('/training');
  const [exercises, template, profile] = await Promise.all([getExerciseLibrary(), getWorkoutTemplate(params.templateId), getProfile(supabase, access.user.id)]);
  return <AppShell active="training"><div className="grid max-w-3xl gap-5"><Link href="/training" className="text-sm text-primary">← Training</Link><PageHeader title="Edit workout" description="Changes apply to future sessions. Existing session snapshots are preserved." /><WorkoutEditor exercises={exercises} template={template} units={profile.unit_system} /></div></AppShell>;
}
