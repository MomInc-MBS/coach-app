// R9-OFFLINE: the pose tracker is served same-origin from /vendor/mediapipe/<version>/ so a camera
// workout opened once online also runs offline. These are the exact files live used from the CDNs,
// each checked by sha256, downloaded once into vendor/mediapipe/ (gitignored). Same file in both apps.
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
export const MEDIAPIPE_VERSION='0.10.14';
const npm=`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/`,model='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/';
const FILES={
 'vision_bundle.mjs':[npm,'e77f281f9619150d937023c355bae170e9120e3b9e43f1e23a2a7bee07197669'],
 'wasm/vision_wasm_internal.js':[npm,'9440cf0cc0cea21800e31581ec32aeedcc5fbf9df4509796bbc7d3f99e52ab9c'],
 'wasm/vision_wasm_internal.wasm':[npm,'f82a8e6c05e08a44cc9f9e7ec5f845935bcbb1b1500ebe8c2f4812fb4e2917dc'],
 // Browsers without WebAssembly SIMD (Safari before 16.4) fetch these instead.
 'wasm/vision_wasm_nosimd_internal.js':[npm,'abe9b6fbeaf86fcb53a5edce3926c82ccb0619e18fed4d9d9ce561ee7f55e054'],
 'wasm/vision_wasm_nosimd_internal.wasm':[npm,'38b61feab2fd7934e05cbe9f68baa308978a5e3b7f85c1913bb8ae89b8ef8b97'],
 'pose_landmarker_lite.task':[model,'59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'],
};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function ensureMediapipe(root=`vendor/mediapipe/${MEDIAPIPE_VERSION}`){
 for(const [name,[base,expected]] of Object.entries(FILES)){
  const path=`${root}/${name}`;let bytes=await readFile(path).catch(()=>null);
  if(bytes&&sha256(bytes)===expected)continue;
  const response=await fetch(base+name);if(!response.ok)throw Error(`Could not download MediaPipe ${name}: ${response.status}`);
  bytes=Buffer.from(await response.arrayBuffer());if(sha256(bytes)!==expected)throw Error(`MediaPipe content check failed: ${name}`);
  await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);
 }
}
