import sharp from 'sharp';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('icons',{recursive:true});
// Resize the original MYR5 artwork without redrawing or cropping it.
const source='icons/myr5-original.png',background='#21172f';
async function icon(size,name,ratio=.9){
 const edge=Math.round(size*ratio),pad=Math.floor((size-edge)/2);
 const art=await sharp(source).resize(edge,edge,{fit:'contain',background}).png().toBuffer();
 await sharp({create:{width:size,height:size,channels:3,background}}).composite([{input:art,left:pad,top:pad}]).removeAlpha().png().toFile('icons/'+name);
}
for(const size of [192,512]){await icon(size,`myr5-alien-${size}.png`);await copyFile(`icons/myr5-alien-${size}.png`,`icons/coach-${size}.png`);}
await icon(180,'myr5-alien-apple.png');
await icon(512,'myr5-alien-maskable.png',.76);
