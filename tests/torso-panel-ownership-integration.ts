import * as T from 'three';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {correctTorsoPanelOwnership} from '../creature/source/torso-panel-ownership';
(globalThis as any).createImageBitmap=async()=>({width:1,height:1,close(){}});(globalThis as any).self=globalThis;await MeshoptDecoder.ready;
function tris(o:T.Object3D){let n=0;o.traverse(m=>{if(m instanceof T.Mesh)n+=(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3;});return n;}
for(const id of ['roster/11-anvil-cask--clay-style_robot_3d_model','roster/22-curve--stylized_alien_3d_model','roster/23-blob-texture-bodies--honeycomb_humanoid_3d_model','roster/10-petal-wisp--ghost_character_3d_model','roster/10-petal-wisp--fantasy_creature_3d_model4']){
 const bytes=readFileSync(fileURLToPath(new URL(`../creature/models/${id}.glb`,import.meta.url))),scene=(await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 const before=tris(scene),armsBefore=tris(scene.getObjectByName('arms')!),bodyBefore=tris(scene.getObjectByName('body')!),moved=correctTorsoPanelOwnership(scene,id);
 if(!moved||tris(scene)!==before||tris(scene.getObjectByName('body')!)!==bodyBefore+moved)throw Error(`Ownership/count failed: ${id}`);
 if(tris(scene.getObjectByName('arms')!)<1000||tris(scene.getObjectByName('feet')!)<800)throw Error(`Real limbs lost: ${id}`);
 if(correctTorsoPanelOwnership(scene,id)!==0)throw Error(`Repair must be idempotent: ${id}`);
 console.log(JSON.stringify({id,moved,armsBefore,armsAfter:tris(scene.getObjectByName('arms')!),conserved:true}));
}
