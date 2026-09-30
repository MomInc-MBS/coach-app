import {readFile,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
// Shrinks a GLB without changing what a loader gets back, so code that reads vertices, samples
// triangles or finds nodes by name behaves exactly as with the authored file. Vertex, index, skin and
// animation data move into EXT_meshopt_compression with no quantization, filters or reordering, and
// index buffers use INDICES mode (TRIANGLES mode rotates each triangle's corners): every accessor
// decodes to its original bytes, checked here before anything is written. The glTF JSON is kept
// (names, transforms, materials); only buffer views move, and identical ones share bytes (this
// replaces the old compaction pass). PNG textures become lossless WebP only when the decoded pixels
// match and it is smaller; JPEGs stay JPEG (re-encoding them loses detail).
// ponytail: lossless only. Rounding normals to 16 bits (exponential filter) saves ~15 MiB more but moved
// sub-pixel detail on sculpted styles (iris fibres) in the before/after frames; quantizing positions or
// normals breaks the customizer (sculpting, computeVertexNormals, eye placement).
// Loaders of these files need setMeshoptDecoder (creature/source/creator/assemble.ts, handborne).
const SIZE={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},COUNT={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
const align=n=>n+3&~3;

export async function optimizeGLB(input){
 if(input.readUInt32LE(0)!==0x46546c67||input.readUInt32LE(4)!==2)throw Error('Expected GLB 2');
 const jsonLength=input.readUInt32LE(12),doc=JSON.parse(input.subarray(20,20+jsonLength));
 if(doc.extensionsUsed?.includes('EXT_meshopt_compression')||doc.buffers?.length!==1||doc.buffers[0].uri)return input;
 const bin=input.subarray(28+jsonLength,28+jsonLength+input.readUInt32LE(20+jsonLength));
 await MeshoptEncoder.ready;await MeshoptDecoder.ready;
 // How each buffer view is read: by element size (vertices, skins, animation) or as indices.
 const use=new Map(),skip=new Set();
 for(const a of doc.accessors||[]){
  if(a.sparse){skip.add(a.sparse.indices.bufferView);skip.add(a.sparse.values.bufferView);}
  if(a.bufferView==null)continue;const u=use.get(a.bufferView)??{sizes:new Set()};u.sizes.add(SIZE[a.componentType]*COUNT[a.type]);u.component=SIZE[a.componentType];use.set(a.bufferView,u);
 }
 for(const mesh of doc.meshes||[])for(const p of mesh.primitives)if(p.indices!=null&&doc.accessors[p.indices].bufferView!=null)use.get(doc.accessors[p.indices].bufferView).index=true;
 const images=new Map((doc.images||[]).map((image,i)=>[image.bufferView,i]));
 const chunks=[],seen=new Map();let size=0,fallback=0,packed=0,webps=0;
 const put=bytes=>{const key=createHash('sha256').update(bytes).digest('base64');if(!seen.has(key)){seen.set(key,size);chunks.push(bytes,Buffer.alloc(align(bytes.length)-bytes.length));size+=align(bytes.length);}return seen.get(key);};
 for(const [i,view] of (doc.bufferViews||[]).entries()){
  let bytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  const u=use.get(i),image=images.get(i);
  if(u&&!skip.has(i)&&!view.extensions&&!(u.index&&u.sizes.size>1)){
   const mode=u.index?'INDICES':'ATTRIBUTES',stride=u.index?u.component:view.byteStride??(u.sizes.size===1?[...u.sizes][0]:4);
   if((u.index?stride===2||stride===4:stride%4===0&&stride<=256)&&view.byteLength%stride===0){
    const count=view.byteLength/stride,source=new Uint8Array(bytes),out=MeshoptEncoder.encodeGltfBuffer(source,count,stride,mode);
    const back=new Uint8Array(count*stride);MeshoptDecoder.decodeGltfBuffer(back,count,stride,out,mode,'NONE');
    if(!Buffer.from(back).equals(source))throw Error(`Buffer view ${i} did not decode to its original bytes.`);
    if(out.length<view.byteLength){
     view.extensions={EXT_meshopt_compression:{buffer:0,byteOffset:put(Buffer.from(out)),byteLength:out.length,byteStride:stride,mode,count}};
     view.buffer=1;view.byteOffset=fallback;fallback=align(fallback+view.byteLength);packed++;continue;
    }
   }
  }
  if(image!=null&&doc.images[image].mimeType==='image/png'){
   const out=await sharp(bytes).webp({lossless:true,exact:true,effort:6}).toBuffer();
   const [a,b]=await Promise.all([bytes,out].map(x=>sharp(x).ensureAlpha().raw().toBuffer()));
   if(out.length<bytes.length&&a.equals(b)){
    bytes=out;doc.images[image].mimeType='image/webp';webps++;
    for(const t of doc.textures||[])if(t.source===image){delete t.source;t.extensions={...t.extensions,EXT_texture_webp:{source:image}};}
   }
  }
  view.byteOffset=put(bytes);
 }
 const used=new Set(doc.extensionsUsed),required=new Set(doc.extensionsRequired);
 doc.buffers=[{byteLength:size}];
 if(packed){doc.buffers.push({byteLength:fallback,extensions:{EXT_meshopt_compression:{fallback:true}}});used.add('EXT_meshopt_compression');required.add('EXT_meshopt_compression');}
 if(webps){used.add('EXT_texture_webp');required.add('EXT_texture_webp');}
 if(used.size)doc.extensionsUsed=[...used];if(required.size)doc.extensionsRequired=[...required];
 let json=Buffer.from(JSON.stringify(doc));json=Buffer.concat([json,Buffer.alloc(align(json.length)-json.length,32)]);
 const body=Buffer.concat(chunks),head=Buffer.alloc(28);
 head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+body.length,8);head.writeUInt32LE(json.length,12);head.writeUInt32LE(0x4e4f534a,16);
 head.writeUInt32LE(body.length,20);head.writeUInt32LE(0x004e4942,24);
 return Buffer.concat([head.subarray(0,20),json,head.subarray(20),body]);
}

// Rewrites every GLB under root in place (the build runs this on its dist copy); returns bytes saved.
export async function optimizeModels(root){let saved=0;for(const entry of await readdir(root,{withFileTypes:true})){const path=join(root,entry.name);if(entry.isDirectory())saved+=await optimizeModels(path);else if(entry.name.endsWith('.glb')){const input=await readFile(path),out=await optimizeGLB(input);if(out.length<input.length){await writeFile(path,out);saved+=input.length-out.length;}}}return saved;}
