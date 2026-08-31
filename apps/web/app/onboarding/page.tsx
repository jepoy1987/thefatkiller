import { Alert } from '../../components/ui/alert';
import { PageHeader } from '../../components/ui/headings';
import { OnboardingForm } from '../../features/onboarding/onboarding-form';
import { getOnboardingFoundation } from '../../lib/data/dashboard';

export default async function OnboardingPage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile } = await getOnboardingFoundation();
  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6 sm:py-12"><div className="mb-8 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground">TFK</span><span className="font-black">The Fat Killer</span></div><PageHeader eyebrow="Account setup" title="Build your daily plan" description="Four focused sections establish your profile and targets. You can adjust these later in Settings." />{searchParams.error ? <div className="mt-5"><Alert variant="error">{searchParams.error}</Alert></div> : null}<OnboardingForm profile={profile} /></main>;
}
