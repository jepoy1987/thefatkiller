import Link from 'next/link';
import { hasFeature } from '@tfk/access';
import { AppShell } from '../../../components/layout/app-shell';
import { PageHeader } from '../../../components/ui/headings';
import { Alert } from '../../../components/ui/alert';
import { PhotoUpload } from '../../../features/food-photo/upload';
import { createClient } from '../../../lib/data/client';
import { requireUser } from '../../../lib/data/session';
import { getCurrentEntitlements } from '../../../lib/data/entitlements';
import { foodPhotoMode } from '../../../server/food-photo/service';
export default async function FoodPhotoPage(){
 const client=createClient();await requireUser(client);const allowed=hasFeature(await getCurrentEntitlements(client),'ai_food_photo');const mode=foodPhotoMode();
 return <AppShell active="nutrition"><div className="grid max-w-3xl gap-5"><PageHeader eyebrow="Nutrition" title="Log from photo" description="Take a meal photo, review the estimates, then choose what to save."/>{!allowed?<Alert>Photo logging is not included in your current access. Manual logging remains available.</Alert>:mode==='disabled'?<Alert>Photo analysis is not available yet. You can still log your meal manually.</Alert>:mode==='local_mock'?<Alert variant="warning">Local mock QA — no real image recognition. Do not use these fixture estimates as nutrition advice.</Alert>:null}<PhotoUpload enabled={allowed&&mode!=='disabled'}/><Link href="/nutrition#manual-food-logging" className="underline">Log manually</Link></div></AppShell>;
}
