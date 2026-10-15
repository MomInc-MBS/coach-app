import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {assembleCreature} from '../creature/source/creator/assemble';
import {fresh} from '../creature/source/creator/design';

const ids=[
  {id:'roster/10-petal-wisp--ghost_character_3d_model',bodyFaces:971,minimumArms:1800},
  {id:'roster/10-petal-wisp--fantasy_creature_3d_model4',bodyFaces:1229,minimumArms:2000},
];
const prefix='http://audit/creature/models/';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input:any)=>{const url=String(input);if(!url.startsWith(prefix))return nativeFetch(input);return new Response(readFileSync(fileURLToPath(new URL(`../creature/models/${url.slice(prefix.length)}`,import.meta.url))));};
function triangles(object:T.Object3D|undefined){let count=0;object?.traverse(o=>{if(o instanceof T.Mesh)count+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;});return count;}
function recoveredBody(object:T.Object3D|undefined){let count=0;object?.traverse(o=>{if(o instanceof T.Mesh)count+=Number(o.userData.recoveredArmBodyTriangles)||0;});return count;}
for(const {id,bodyFaces,minimumArms} of ids){
  const recipe={...fresh(),headFrom:id,body:id,armsFrom:id,feetFrom:id};
  const assembly=await assembleCreature(recipe,'http://audit/creature/');
  const region=(name:string)=>assembly.root.children.find(o=>o.name===name);
  const actualBody=recoveredBody(region('body')),actualArms=triangles(region('arms'));
  if(actualBody!==bodyFaces||actualArms<minimumArms)throw Error(JSON.stringify({id,actualBody,bodyFaces,actualArms,minimumArms}));
  console.log(JSON.stringify({id,bodySurfaceFleckFaces:actualBody,remainingAnimatedArmFaces:actualArms,triangleConservation:'checked by roster source audit'}));
  assembly.dispose();
}
