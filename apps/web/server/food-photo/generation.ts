import { foodPhotoResultSchema } from '@tfk/validation';
import type { FoodPhotoAnalysis,FoodPhotoResult } from '@tfk/types';
import { FoodPhotoError,type FoodPhotoProvider } from './provider.ts';
export type PhotoPorts={claim:()=>Promise<{claimed:boolean;analysis:FoodPhotoAnalysis}>;upload:(path:string,image:Uint8Array)=>Promise<void>;remove:(path:string)=>Promise<void>;finish:(a:FoodPhotoAnalysis,result:FoodPhotoResult|null,error:string|null,deleted:boolean)=>Promise<void>;provider:FoodPhotoProvider};
export async function runFoodPhoto(image:Uint8Array,ports:PhotoPorts):Promise<string>{
 const {claimed,analysis}=await ports.claim();if(!claimed)return analysis.id;
 let result:FoodPhotoResult|null=null;let error:string|null=null;let deleted=false;
 try{
  await ports.upload(analysis.storage_path!,image);
  // Do not retain images during slow provider processing or review. Provider uses memory bytes.
  await ports.remove(analysis.storage_path!);deleted=true;
  const parsed=foodPhotoResultSchema.safeParse(await ports.provider(image));if(!parsed.success)throw new FoodPhotoError('invalid_output');result=parsed.data;
 }catch(e){error=e instanceof FoodPhotoError?e.code:'provider_failed';}
 finally{
  if(!deleted){try{await ports.remove(analysis.storage_path!);deleted=true;}catch{error='cleanup_failed';}}
  await ports.finish(analysis,result,error,deleted);
 }
 return analysis.id;
}
