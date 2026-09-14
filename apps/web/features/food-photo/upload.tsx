'use client';
import { useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
export function PhotoUpload({enabled,analysisId,retry=false}:{enabled:boolean;analysisId?:string;retry?:boolean}){
 const router=useRouter();const id=useRef(analysisId);const busy=useRef(false);const [phase,setPhase]=useState('');const [error,setError]=useState('');
 return <form className="grid gap-4" onSubmit={e=>{e.preventDefault();if(busy.current||!enabled)return;busy.current=true;setError('');setPhase('Uploading…');id.current??=crypto.randomUUID();const data=new FormData(e.currentTarget);data.set('analysis_id',id.current);data.set('retry',String(retry));const xhr=new XMLHttpRequest();xhr.open('POST','/nutrition/photo/analyze');xhr.timeout=60000;xhr.upload.onload=()=>setPhase('Analyzing…');const failed=()=>{busy.current=false;setPhase('');setError('Request interrupted. Reload to check its status before retrying.');};xhr.onerror=failed;xhr.ontimeout=failed;xhr.onload=()=>{busy.current=false;setPhase('');let result;try{result=JSON.parse(xhr.responseText);}catch{failed();return;}if(xhr.status!==200){setError(result.error??'Analysis unavailable.');return;}router.push(`/nutrition/photo/${result.analysisId}`);router.refresh();};xhr.send(data);}}>
 <label className="grid gap-2 font-semibold">Take a photo or upload a meal<input type="file" name="photo" accept="image/*" capture="environment" required disabled={!enabled||!!phase} className="block w-full rounded border p-3"/></label>
 <p className="text-sm text-muted-foreground">JPG, PNG or WebP, up to 3 MB. Your photo is processed privately and normally deleted before review. Do not include other people or sensitive information.</p>
 <Button type="submit" disabled={!enabled||!!phase}>{phase|| (retry?'Retry analysis':'Analyze photo')}</Button>
 {phase?<p role="status" aria-live="polite">{phase}</p>:null}{error?<Alert variant="error">{error}</Alert>:null}
 {id.current&&error?<a className="underline" href={`/nutrition/photo/${id.current}`}>Check existing analysis</a>:null}
 </form>;
}
