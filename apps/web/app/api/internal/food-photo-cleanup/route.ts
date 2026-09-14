import { NextResponse,type NextRequest } from 'next/server';
import { cleanupAuthorized,cleanupFoodPhotoBatch } from '../../../../server/food-photo/cleanup';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:NextRequest){
 if(!cleanupAuthorized(request.headers.get('authorization'),process.env.FOOD_PHOTO_CLEANUP_SECRET))return NextResponse.json({error:'Unauthorized'},{status:401});
 const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY||!url)return NextResponse.json({error:'Cleanup unavailable'},{status:503});
 try{const result=await cleanupFoodPhotoBatch({url,key:process.env.SUPABASE_SERVICE_ROLE_KEY});
 return NextResponse.json(result,{status:result.failed?503:200});}catch{return NextResponse.json({error:'Cleanup failed'},{status:503});}
}
