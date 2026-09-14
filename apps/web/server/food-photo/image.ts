import sharp from 'sharp';
export const MAX_PHOTO_BYTES=3*1024*1024;
export async function prepareFoodPhoto(bytes:Uint8Array,mime:string):Promise<Buffer>{
 if(!bytes.length||bytes.length>MAX_PHOTO_BYTES||!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error('Choose a JPG, PNG or WebP up to 3 MB.');
 try{
  const image=sharp(bytes,{limitInputPixels:16000000,animated:false,failOn:'warning'});const info=await image.metadata();
  const formats:Record<string,string>={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'};
  if(info.format!==formats[mime]||!info.width||!info.height||info.width<32||info.height<32||(info.pages??1)>1)throw new Error('invalid');
  // No keepMetadata/withMetadata: re-encoding strips EXIF and location information.
  const result=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
  if(result.length>MAX_PHOTO_BYTES)throw new Error('large');return result;
 }catch{throw new Error('This image could not be decoded. Choose a clear JPG, PNG or WebP.');}
}
