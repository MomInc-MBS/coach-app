import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..'),base='D:/myr5-work/release-22',require=createRequire(resolve(base,'package.json'));
const {build}=require('esbuild');
const creator=resolve(root,'creature/source/creator');
const built=await build({stdin:{contents:`export {authoredUvScale,sculptMaterial,growMaterial} from './material-language';export {STYLES} from './catalog';export {createCoachReliefBudget} from './material-refinement';export * as THREE from 'three';`,resolveDir:creator,loader:'ts'},bundle:true,format:'esm',platform:'neutral',write:false,target:'es2022',nodePaths:[resolve(base,'node_modules')],plugins:[{name:'read-baseline-deps',setup(build){build.onResolve({filter:/^\./},args=>{if(!args.resolveDir.startsWith(root))return;const candidate=resolve(args.resolveDir,args.path);if(existsSync(candidate)||existsSync(candidate+'.ts'))return;return {path:resolve(base,'creature/source/creator',args.path)+'.ts'};});}}]});
const {THREE:T,STYLES,authoredUvScale,sculptMaterial,growMaterial,createCoachReliefBudget}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));

test('authored UV pattern stays visible when the imported body is ten times larger',()=>{
  const small=new T.BoxGeometry(1,2,1),large=new T.BoxGeometry(10,20,10),matrix=new T.Matrix4();
  const smallScale=authoredUvScale(small,matrix),largeScale=authoredUvScale(large,matrix);
  assert.ok(smallScale>1&&smallScale<=6);
  assert.ok(largeScale>1&&largeScale<=6);
  assert.ok(largeScale/smallScale<1.6,`pattern scale drifted ${smallScale} -> ${largeScale}`);
});

test('alternate coach relief is bounded on tiny and oversized meshes',()=>{
  for(const dimensions of [[.1,.1,.1],[10,20,10]]){
    const original=new T.BoxGeometry(...dimensions),before=original.attributes.position.array.slice(),mesh=new T.Mesh(original,new T.MeshStandardMaterial());
    sculptMaterial(mesh,STYLES[6],1,1,createCoachReliefBudget(0));
    const after=mesh.geometry.attributes.position;
    assert.equal(after.count,before.length/3);
    let max=0;for(let i=0;i<after.count;i++)max=Math.max(max,Math.hypot(after.getX(i)-before[i*3],after.getY(i)-before[i*3+1],after.getZ(i)-before[i*3+2]));
    assert.ok(max<=Math.min(.019,Math.max(...dimensions)*.015)+1e-5,`relief ${max} on ${dimensions}`);
    const uv=mesh.geometry.attributes.uv;let high=0;for(let i=0;i<uv.count;i++)high=Math.max(high,Math.abs(uv.getX(i)),Math.abs(uv.getY(i)));assert.ok(high<12,`UV range ${high}`);
  }
});

test('Coral details surround a large native shell and stay within a bounded silhouette',()=>{
  const group=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(10,10,10),new T.MeshStandardMaterial());mesh.scale.x=-1;group.add(mesh);
  const growth=growMaterial(group,STYLES[6],'body',1,1);
  assert.ok(growth.children.length>0);
  const box=new T.Box3().setFromObject(growth);
  assert.ok(box.min.x<-5.05&&box.max.x>5.05&&box.min.z<-5.05&&box.max.z>5.05,'growth reaches outside the front and sides');
  assert.ok(box.min.y<0&&box.max.y>0,'growth is not concentrated only on the top');
  assert.ok(Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.y),Math.abs(box.max.y),Math.abs(box.min.z),Math.abs(box.max.z))<7,'details do not spike far past the shell');
});
