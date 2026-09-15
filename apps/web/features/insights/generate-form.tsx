'use client';
import { useFormState } from 'react-dom';
import { generateWeeklyInsight } from '../../server/actions/insights';
import { SubmitButton } from '../../components/forms/submit-button';
import { Alert } from '../../components/ui/alert';
export function GenerateInsightForm({disabled=false,retry=false}:{disabled?:boolean;retry?:boolean}){
 const [state,action]=useFormState(generateWeeklyInsight,{});
 return <form action={action} className="grid gap-4">
  <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" name="consent" required disabled={disabled} className="mt-1" /><span>Send the structured summary shown below to OpenAI to explain my week. This excludes notes, photos and GLP-1 data. The insight stays private to my account.</span></label>
  {state.error?<Alert variant="error">{state.error}</Alert>:null}
  <fieldset disabled={disabled}><SubmitButton pendingLabel="Generating your insight…" className="w-fit">{retry?'Retry weekly insight':'Generate weekly insight'}</SubmitButton></fieldset>
 </form>;
}
