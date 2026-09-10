import test from 'node:test';
import assert from 'node:assert/strict';
test('the shipped phone viewer imports every current and legacy coach material',async()=>{
 const previous=globalThis.document;globalThis.document={getElementById:()=>null};
 try{const {importCreature}=await import('../creature/assets/phone.js');
 for(let id=0;id<23;id++){const recipe={version:1,styles:Object.fromEntries(['head','eye','collar','body','arms','feet'].map(r=>[r,id])),eye:'open',fur:1,iris:1};assert.equal(importCreature(JSON.stringify(recipe)).styles.head,id);}
 assert.throws(()=>importCreature('{"version":1,"styles":{"head":23}}'));
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
