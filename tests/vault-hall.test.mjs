import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {COACH_REQUIREMENTS} from '../performance-catalog.mjs';
import {pickCoaches,coachPath,nearestStatue,residentWindow,stopAt,cardModel,firstUnearned,isEarned,GAP,archivedCompletionRows,archivePackLabel,bindArchiveDialog} from '../modules/vault/vault-hall.mjs';
const goals=Array.from({length:12},(_,i)=>({id:'g'+i,clue:'c'+i,title:'T'+i,tier:'rare',test:s=>!!s.earned?.['g'+i],progress:()=>({have:3,need:10})}));
test('statues use the highest unlock-level coaches working down, no repeats, last = highest',()=>{
 const R={easy:0,medium:1,hard:2,expert:3},n=40,ids=pickCoaches(n,COACH_REQUIREMENTS);
 assert.equal(ids.length,n);assert.equal(new Set(ids).size,n);
 const lv=ids.map(id=>R[COACH_REQUIREMENTS.find(c=>c.id===id).difficulty]);
 assert.deepEqual(lv,[...lv].sort((a,b)=>a-b));assert.equal(lv.at(-1),3);
 const dropped=COACH_REQUIREMENTS.filter(c=>!ids.includes(c.id)).map(c=>R[c.difficulty]);assert.ok(Math.max(...dropped)<=lv[0]);
 for(const id of ids)assert.ok(fs.existsSync(new URL('..'+coachPath(id),import.meta.url)),id);
});
test('at most 5 statues resident at any position',()=>{
 for(let c=0;c<40;c++){const w=residentWindow(c,40);assert.ok(w.length<=5&&w.includes(c));assert.ok(w.every(i=>i>=c-1&&i<=c+3));}
 assert.deepEqual(residentWindow(0,3),[0,1,2]);
});
test('walking to statue k selects card k',()=>{
 for(let k=0;k<12;k++){assert.equal(nearestStatue(stopAt(k),12),k);}
 assert.equal(nearestStatue(stopAt(2)+GAP/2,12),-1);
});
test('earned vs locked card, progress, next',()=>{
 const st={earned:{g0:{at:Date.parse('2026-10-06')}}};
 assert.equal(firstUnearned(goals,st),1);assert.equal(isEarned(goals[0],st),true);
 const e=cardModel(goals[0],st,['reward-pack:rare:vault-g0']),l=cardModel(goals[1],st);
 assert.ok(e.earned&&e.title==='T0'&&e.date&&e.pack);assert.ok(!l.earned&&l.title==='???'&&l.clue==='c1'&&l.progress.have===3&&l.progress.need===10);
 assert.equal(cardModel(goals[1],{}).pack,null);
 assert.equal(firstUnearned(goals,{}),0);
});

test('past-achievement rows show only existing archived awards and preserve pack records',()=>{
 const rows=archivedCompletionRows([{id:'old-a',title:'Old award',tier:'rare',earned:{at:12345},packId:'reward-pack:secret:vault-old-a'},{id:'not-earned',title:'Hidden award',tier:'rare'},{id:'old-b',title:'Second award',tier:'legendary',earned:0,packId:'reward-pack:secret:vault-old-b'}]);
 assert.deepEqual(rows.map(x=>({id:x.id,title:x.title,packId:x.packId})),[{id:'old-a',title:'Old award',packId:'reward-pack:secret:vault-old-a'},{id:'old-b',title:'Second award',packId:'reward-pack:secret:vault-old-b'}]);
 assert.equal(archivePackLabel(rows[0],false),'Reward pack earned');assert.equal(archivePackLabel(rows[0],true),'Reward pack opened');assert.doesNotMatch(archivePackLabel(rows[0],false),/vault-old-a/);
 assert.ok(rows[0].date);assert.equal(rows[1].date,new Date(0).toLocaleDateString());
});

test('archive dialog opens, closes on Escape, restores focus, and removes its listeners',()=>{
 class Events{constructor(){this.handlers=new Map();this.isConnected=true;this.focused=0;}addEventListener(k,f){const a=this.handlers.get(k)||[];a.push(f);this.handlers.set(k,a);}removeEventListener(k,f){this.handlers.set(k,(this.handlers.get(k)||[]).filter(x=>x!==f));}dispatch(k,event={}){for(const f of this.handlers.get(k)||[])f(event);}focus(){this.focused++;}}
 const doc=new Events(),opener=new Events(),closeButton=new Events(),dialog={hidden:true},binding=bindArchiveDialog({dialog,openButton:opener,closeButton,documentRef:doc});
 opener.dispatch('click');assert.equal(dialog.hidden,false);assert.equal(closeButton.focused,1);
 let prevented=0,stopped=0;doc.dispatch('keydown',{key:'Tab',preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});
 assert.equal(dialog.hidden,false);assert.equal(closeButton.focused,2);assert.equal(prevented,1);assert.equal(stopped,1,'Tab remains inside the modal instead of escaping behind it');
 prevented=0;stopped=0;doc.dispatch('keydown',{key:'Escape',preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});
 assert.equal(dialog.hidden,true);assert.equal(opener.focused,1);assert.equal(prevented,1);assert.equal(stopped,1);
 binding.open();binding.dispose();assert.equal(dialog.hidden,true);assert.equal((doc.handlers.get('keydown')||[]).length,0);assert.equal((opener.handlers.get('click')||[]).length,0);assert.equal((closeButton.handlers.get('click')||[]).length,0);
});
