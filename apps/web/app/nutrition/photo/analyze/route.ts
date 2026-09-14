import { NextResponse,type NextRequest } from 'next/server';
import { hasFeature } from '@tfk/access';
import { z } from 'zod';
import { createClient } from '../../../../lib/data/client';
import { getCurrentEntitlements } from '../../../../lib/data/entitlements';
import { analyzeFoodPhoto,foodPhotoMode } from '../../../../server/food-photo/service';
import { MAX_PHOTO_BYTES,prepareFoodPhoto } from '../../../../server/food-photo/image';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:NextRequest){
 // Next's local bind address can differ from Host. Keep exact protocol + host
 // validation; accepting only a matching hostname would permit cross-scheme origins.
 const expectedOrigin=`${request.nextUrl.protocol}//${request.headers.get('host')}`;
 if(request.headers.get('origin')!==expectedOrigin)return NextResponse.json({error:'Invalid request origin.'},{status:403});
 const client=createClient();const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in to analyze a photo.'},{status:401});
 if(!hasFeature(await getCurrentEntitlements(client),'ai_food_photo'))return NextResponse.json({error:'Photo logging is not included in your current access. Manual logging is available.'},{status:403});
 if(foodPhotoMode()==='disabled')return NextResponse.json({error:'Photo analysis is not available yet. Please log manually.'},{status:409});
 try{
  const reader=request.body?.getReader();if(!reader)throw new Error('empty');const chunks:Uint8Array[]=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PHOTO_BYTES+65536){await reader.cancel();return NextResponse.json({error:'Choose a photo up to 3 MB.'},{status:413});}chunks.push(value);}
  const data=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData();
  const id=z.string().uuid().parse(data.get('analysis_id'));const photo=data.get('photo');if(!(photo instanceof File))throw new Error('image');
  const image=await prepareFoodPhoto(new Uint8Array(await photo.arrayBuffer()),photo.type);
  const analysisId=await analyzeFoodPhoto(user.id,id,data.get('retry')==='true',image);
  return NextResponse.json({analysisId});
 }catch{return NextResponse.json({error:'The photo could not be analyzed. Check the image and your daily allowance, then retry explicitly or log manually.'},{status:400});}
}
