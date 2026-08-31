'use server';

import { bodyMeasurementSchema, progressPhotoSchema, weightEntrySchema, weightToKilograms } from '@tfk/validation';
import { getFeatureLimit, hasFeature } from '@tfk/access';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/data/client';
import { requireUser } from '../../lib/data/session';
import { formValue, redirectWithError } from './form';
import { getCurrentEntitlements } from '../../lib/data/entitlements';

const finish = (message: string) => { revalidatePath('/progress'); revalidatePath('/dashboard'); redirect(`/progress?message=${encodeURIComponent(message)}`); };

export async function saveWeight(data: FormData) {
  const parsed = weightEntrySchema.safeParse({ id: formValue(data, 'id') || undefined, weight: formValue(data, 'weight'), recorded_at: formValue(data, 'recorded_at'), notes: formValue(data, 'notes') });
  if (!parsed.success) redirectWithError('/progress', parsed.error.issues[0]?.message ?? 'Invalid weight entry.');
  const input = parsed.data!;
  const supabase = createClient(); const user = await requireUser(supabase);
  const payload = { user_id: user.id, weight_kg: weightToKilograms(input.weight, formValue(data, 'unit_system') === 'imperial' ? 'imperial' : 'metric'), recorded_at: new Date(input.recorded_at).toISOString(), source: 'manual' as const, notes: input.notes || null };
  const result = input.id ? await supabase.from('weight_entries').update(payload).eq('id', input.id) : await supabase.from('weight_entries').insert(payload);
  if (result.error) redirectWithError('/progress', 'Weight could not be saved.');
  finish(input.id ? 'Weight updated.' : 'Weight saved.');
}

export async function deleteWeight(data: FormData) {
  const supabase = createClient(); await requireUser(supabase);
  const { error } = await supabase.from('weight_entries').delete().eq('id', formValue(data, 'id'));
  if (error) redirectWithError('/progress', 'Weight could not be deleted.');
  finish('Weight deleted.');
}

export async function saveMeasurement(data: FormData) {
  const parsed = bodyMeasurementSchema.safeParse({ id: formValue(data, 'id') || undefined, measurement_type: formValue(data, 'measurement_type'), value: formValue(data, 'value'), recorded_at: formValue(data, 'recorded_at'), notes: formValue(data, 'notes') });
  if (!parsed.success) redirectWithError('/progress', parsed.error.issues[0]?.message ?? 'Invalid measurement.');
  const input = parsed.data!;
  const supabase = createClient(); const user = await requireUser(supabase); const units = formValue(data, 'unit_system');
  const canonicalValue = input.measurement_type === 'body_fat' || units === 'metric' ? input.value : input.value * 2.54;
  const payload = { user_id: user.id, measurement_type: input.measurement_type, value: Number(canonicalValue.toFixed(2)), recorded_at: new Date(input.recorded_at).toISOString(), notes: input.notes || null };
  const result = input.id ? await supabase.from('body_measurements').update(payload).eq('id', input.id) : await supabase.from('body_measurements').insert(payload);
  if (result.error) redirectWithError('/progress', 'Measurement could not be saved.');
  finish(input.id ? 'Measurement updated.' : 'Measurement saved.');
}

export async function deleteMeasurement(data: FormData) {
  const supabase = createClient(); await requireUser(supabase);
  const { error } = await supabase.from('body_measurements').delete().eq('id', formValue(data, 'id'));
  if (error) redirectWithError('/progress', 'Measurement could not be deleted.');
  finish('Measurement deleted.');
}

export async function uploadProgressPhoto(data: FormData) {
  const parsed = progressPhotoSchema.safeParse({ photo_type: formValue(data, 'photo_type'), recorded_at: formValue(data, 'recorded_at'), weight: formValue(data, 'weight'), notes: formValue(data, 'notes') });
  const file = data.get('photo');
  if (!parsed.success) redirectWithError('/progress', parsed.error.issues[0]?.message ?? 'Invalid photo details.');
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) redirectWithError('/progress', 'Choose a JPG, PNG, or WebP image up to 10 MB.');
  const input = parsed.data!; const photoFile = file as File;
  const supabase = createClient(); const user = await requireUser(supabase);
  const entitlements = await getCurrentEntitlements(supabase);
  if (!hasFeature(entitlements, 'progress_photos')) redirectWithError('/progress', 'Progress photos are not included in your current plan.');
  const maxPhotos = getFeatureLimit(entitlements, 'progress_photos', 'max_active');
  if (typeof maxPhotos === 'number') {
    const { count, error } = await supabase.from('progress_photos').select('id', { count: 'exact', head: true });
    if (error) redirectWithError('/progress', 'Your progress photo allowance could not be checked.');
    if ((count ?? 0) >= maxPhotos) redirectWithError('/progress', `Your ${entitlements.plan.name} plan includes up to ${maxPhotos} progress photos.`);
  }
  const extension = photoFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from('progress-photos').upload(path, photoFile, { contentType: photoFile.type, upsert: false });
  if (upload.error) redirectWithError('/progress', 'Photo upload failed.');
  const weight = input.weight === '' || input.weight === undefined ? null : weightToKilograms(input.weight, formValue(data, 'unit_system') === 'imperial' ? 'imperial' : 'metric');
  const metadata = await supabase.from('progress_photos').insert({ user_id: user.id, storage_path: path, photo_type: input.photo_type, recorded_at: new Date(input.recorded_at).toISOString(), weight_kg: weight, notes: input.notes || null });
  if (metadata.error) { await supabase.storage.from('progress-photos').remove([path]); redirectWithError('/progress', 'Photo metadata could not be saved.'); }
  finish('Photo uploaded.');
}

export async function deleteProgressPhoto(data: FormData) {
  const supabase = createClient(); await requireUser(supabase); const id = formValue(data, 'id');
  const { data: photo } = await supabase.from('progress_photos').select('storage_path').eq('id', id).maybeSingle();
  if (!photo) redirectWithError('/progress', 'Photo not found.'); const selectedPhoto = photo!;
  const removed = await supabase.storage.from('progress-photos').remove([selectedPhoto.storage_path]);
  if (removed.error) redirectWithError('/progress', 'Photo file could not be deleted.');
  const deleted = await supabase.from('progress_photos').delete().eq('id', id);
  if (deleted.error) redirectWithError('/progress', 'Photo metadata could not be deleted.');
  finish('Photo deleted.');
}
