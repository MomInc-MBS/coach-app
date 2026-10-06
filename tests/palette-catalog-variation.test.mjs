import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {colorDistance,paletteDistance} from '../creature/source/creator/color-variation.mjs';

const catalog=JSON.parse(readFileSync('creature/source/creator/palettes.json','utf8'));
// The clear opal/glass additions intentionally include pale transmission colors.
const palettes=catalog.filter(p=>p.id.startsWith('pal-'));
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const neon=hex=>{const c=rgb(hex),hi=Math.max(...c),lo=Math.min(...c);return hi>=.90&&(hi-lo)/hi>=.85;};
test('at least 24 neon palettes replace pale combinations and all colored pastels have stronger pigment',()=>{
 const replacements=palettes.filter(p=>p.name.startsWith('Neon '));
 assert(replacements.length>=24);
 for(const p of replacements)assert(p.colors.filter(neon).length>=2,p.id+' needs two vivid neon stops');
 for(const p of palettes)for(const hex of p.colors){
  const c=rgb(hex),hi=Math.max(...c),lo=Math.min(...c);
  assert(!((hi+lo)/2>=.66&&hi-lo>=.12),p.id+' still has a washed-out color '+hex);
 }
});
test('revamped palettes preserve every existing unlock and reward slot',()=>{
 const metadata=palettes.map(({id,unlockRule,unlockAtDay,reward})=>({id,unlockRule,unlockAtDay,reward}));
 assert.equal(createHash('sha256').update(JSON.stringify(metadata)).digest('hex'),'ffda0050945793b865a5e6192a53500acd6929f8f7af189c9429787283668204');
 assert.equal(palettes.length,107);
});

test('all palette combinations are visibly separated and cover all eight finishes',()=>{
 const finishes=new Set(['matte','brushed-metal','polished-metal','glitter','pearl','watercolor','marbled','glaze']);
 assert.deepEqual(new Set(palettes.map(p=>p.finish)),finishes);
 const close=[];
 for(let i=0;i<palettes.length;i++){
  const p=palettes[i];assert.equal(p.colors.length,3);
  assert(p.colors.every(hex=>/^#[0-9a-f]{6}$/i.test(hex)),p.id);
  for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)assert(colorDistance(p.colors[a],p.colors[b])>=15,`${p.id} has almost identical stops`);
  for(let j=i+1;j<palettes.length;j++)if(paletteDistance(p.colors,palettes[j].colors)<15)close.push(`${p.id}/${palettes[j].id}`);
 }
 assert.deepEqual(close,[],'near-duplicate triads, even after rearranging stops');
});
