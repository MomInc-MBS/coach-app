import {readFile,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
// Lossless storage compaction: identical buffer views share bytes. Accessors,
// geometry, materials and node transforms are unchanged.
export function compactGLB(input){
 if(input.readUInt32LE(0)!==0x46546c67||input.readUInt32LE(4)!==2)throw Error('Expected GLB 2');
 const length=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+length));
 if(doc.buffers?.length!==1||doc.buffers[0].uri||input.readUInt32LE(24+length)!==0x004e4942)throw Error('Expected embedded GLB buffer');
 const bin=input.subarray(28+length),chunks=[],seen=new Map();let size=0;
 for(const view of doc.bufferViews||[]){
  if(view.buffer!==0||view.extensions)throw Error('Unsupported buffer view');
  const bytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  const key=createHash('sha256').update(bytes).digest('hex');const existing=seen.get(key);
  if(existing&&existing.bytes.equals(bytes)){view.byteOffset=existing.offset;continue;}
  const pad=(4-size%4)%4;if(pad){chunks.push(Buffer.alloc(pad));size+=pad;}
  view.byteOffset=size;seen.set(key,{offset:size,bytes});chunks.push(bytes);size+=bytes.length;
 }
 doc.buffers[0].byteLength=size;
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
 const body=Buffer.concat([...chunks,Buffer.alloc((4-size%4)%4)]),out=Buffer.alloc(28+json.length+body.length);
 out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20);out.writeUInt32LE(body.length,20+json.length);out.writeUInt32LE(0x004e4942,24+json.length);body.copy(out,28+json.length);return out;
}
export async function compactModels(root){let saved=0;for(const entry of await readdir(root,{withFileTypes:true})){const path=join(root,entry.name);if(entry.isDirectory())saved+=await compactModels(path);else if(entry.name.endsWith('.glb')){const input=await readFile(path),out=compactGLB(input);if(out.length<input.length){await writeFile(path,out);saved+=input.length-out.length;}}}return saved;}
