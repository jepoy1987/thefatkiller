import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { hasFeature } from '@tfk/access';
import { foodPhotoResultSchema } from '@tfk/validation';
import type { FoodPhotoAnalysis } from '@tfk/types';
import { AppShell } from '../../../../components/layout/app-shell';
import { PageHeader } from '../../../../components/ui/headings';
import { Alert } from '../../../../components/ui/alert';
import { createClient } from '../../../../lib/data/client';
import { requireUser } from '../../../../lib/data/session';
import { getProfile } from '../../../../lib/data/profile';
import { getCurrentEntitlements } from '../../../../lib/data/entitlements';
import { PhotoReview } from '../../../../features/food-photo/review';
import { PhotoUpload } from '../../../../features/food-photo/upload';
import { localPhotoTime } from '../../../../features/food-photo/domain';
import { foodPhotoMode } from '../../../../server/food-photo/service';
export default async function FoodPhotoReviewPage(props:{params: Promise<{analysisId:string}>}) {
 const params = await props.params;
 const client=(await createClient());const user=await requireUser(client);if(!z.string().uuid().safeParse(params.analysisId).success)notFound();
 const {data,error}=await client.from('food_photo_analyses').select('*').eq('id',params.analysisId).eq('user_id',user.id).maybeSingle();if(error||!data)notFound();
 const a=data as FoodPhotoAnalysis;const allowed=hasFeature(await getCurrentEntitlements(client),'ai_food_photo');const profile=await getProfile(client,user.id);const parsed=foodPhotoResultSchema.safeParse(a.result_json);
 const retry=allowed&&a.attempts<3&&(a.status==='failed'||a.status==='pending'&&Date.parse(a.started_at)<Date.now()-120000);
 return <AppShell active="nutrition"><div className="grid max-w-3xl gap-5"><PageHeader eyebrow="Nutrition" title="Review meal estimates" description="Your photo analysis is private. Nothing is logged until you confirm."/>{a.provider==='local_mock'?<Alert variant="warning">Local mock QA result. No real model analyzed this photo.</Alert>:null}
 {!allowed?<Alert>Photo logging is no longer included in your access. You can log manually.</Alert>:a.status==='confirmed'?<Alert variant="success">Meal already saved. Reloading or submitting again will not create duplicate entries.</Alert>:a.status==='completed'&&parsed.success?<PhotoReview id={a.id} result={parsed.data} initialTime={localPhotoTime(new Date().toISOString(),profile.timezone)} timezone={profile.timezone}/>:<Alert variant={a.status==='failed'?'error':'info'}>{a.status==='failed'?'Analysis did not finish. Choose the image again to retry, or log manually.': 'Analysis is pending. Reload to check its status; this does not call the model again.'}</Alert>}
 {retry?<PhotoUpload analysisId={a.id} retry enabled={foodPhotoMode()!=='disabled'}/>:null}
 <p className="text-sm text-muted-foreground">Original photos are not retained for review. Access to abandoned photos and analysis details expires after 24 hours.</p><Link href="/nutrition" className="underline">Back to Nutrition</Link></div></AppShell>;
}
