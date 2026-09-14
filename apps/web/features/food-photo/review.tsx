'use client';
import { useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FoodPhotoItem,FoodPhotoResult,MealType } from '@tfk/types';
import { confirmPhotoReview } from '../../server/actions/food-photo';
import { photoTotals,confidenceText,resizePortion } from './domain';
import { Button } from '../../components/ui/button';
import { Input,Select } from '../../components/ui/form';
import { Alert } from '../../components/ui/alert';
export function PhotoReview({id,result,initialTime,timezone}:{id:string;result:FoodPhotoResult;initialTime:string;timezone:string}){
 const [items,setItems]=useState(result.items.map((item,i)=>({...item,key:String(i)})));const [meal,setMeal]=useState<MealType>('lunch');const [time,setTime]=useState(initialTime);const [notes,setNotes]=useState('');const [saving,setSaving]=useState(false);const lock=useRef(false);const [error,setError]=useState('');const router=useRouter();const totals=photoTotals(items);
 const edit=(key:string,patch:Partial<FoodPhotoItem>)=>setItems(items.map(i=>i.key===key?{...i,...patch}:i));
 return <form className="grid gap-5" onSubmit={async e=>{e.preventDefault();if(lock.current)return;lock.current=true;setSaving(true);setError('');try{const answer=await confirmPhotoReview(id,{items:items.map(({key:_,...item})=>item),meal_type:meal,logged_at:time,notes});if(answer.error)setError(answer.error);else{router.push(`/nutrition?date=${answer.date}&message=Meal%20saved.`);router.refresh();}}catch{setError('Save interrupted. Reload this analysis to check whether it was saved.');}finally{lock.current=false;setSaving(false);}}}>
 <Alert variant="warning">AI estimates can be inaccurate. Review before saving. Sauces, oils and mixed dishes may be uncertain.</Alert>
 <ul className="list-disc pl-5">{result.uncertainties.map((text,i)=><li key={i}>{text}</li>)}</ul>
 <p className="text-sm">Changing a portion amount scales its estimates. You can correct each macro, add missing items, or replace a mixed dish with one edited item and remove its components.</p>
 {items.map((item,index)=><fieldset key={item.key} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2" disabled={saving}><legend className="px-2 font-bold">Food {index+1}</legend>
 <label>Detected food<Input value={item.name} maxLength={120} required onChange={e=>edit(item.key,{name:e.target.value})}/></label><p className="self-center text-sm">{confidenceText(item.confidence)}</p>
 <label>Portion amount<Input type="number" min="0.01" max="10000" step="any" value={item.estimated_portion.amount} required onChange={e=>{const n=Number(e.target.value);if(n>0)edit(item.key,resizePortion(item,n));}}/></label>
 <label>Portion unit<Select value={item.estimated_portion.unit} onChange={e=>edit(item.key,{estimated_portion:{...item.estimated_portion,unit:e.target.value as FoodPhotoItem['estimated_portion']['unit']}})}>{['g','ml','oz','cup','tbsp','tsp','piece','serving','other'].map(u=><option key={u}>{u}</option>)}</Select></label>
 {(['estimated_calories','protein_g','carbs_g','fat_g'] as const).map((key,i)=><label key={key}>{['Calories (kcal)','Protein (g)','Carbs (g)','Fat (g)'][i]}<Input type="number" min="0" max="10000" step="any" required value={item[key]} onChange={e=>edit(item.key,{[key]:Number(e.target.value)})}/></label>)}
 <Button variant="outline" onClick={()=>setItems(items.filter(i=>i.key!==item.key))}>Remove item {index+1}</Button></fieldset>)}
 <Button variant="outline" disabled={saving||items.length>=20} onClick={()=>setItems([...items,{key:crypto.randomUUID(),name:'',estimated_portion:{amount:1,unit:'serving'},estimated_calories:0,protein_g:0,carbs_g:0,fat_g:0,confidence:0}])}>Add missing item</Button>
 <p role="status" aria-live="polite" className="font-bold">Meal total: {totals.calories} kcal · Protein {totals.protein_g} g · Carbs {totals.carbs_g} g · Fat {totals.fat_g} g</p>
 <label>Meal type<Select value={meal} onChange={e=>setMeal(e.target.value as MealType)}>{['breakfast','lunch','dinner','snack'].map(m=><option key={m}>{m}</option>)}</Select></label>
 <label>Meal time ({timezone})<Input type="datetime-local" value={time} onChange={e=>setTime(e.target.value)} required/></label>
 <label>Notes<Input value={notes} maxLength={500} onChange={e=>setNotes(e.target.value)}/></label>
 <p className="text-sm text-muted-foreground">Only Save meal creates Nutrition entries. Items are not added to your saved-food library.</p>
 {error?<Alert variant="error">{error}</Alert>:null}<Button type="submit" disabled={saving||!items.length}>{saving?'Saving…':'Save meal'}</Button>
 </form>;
}
