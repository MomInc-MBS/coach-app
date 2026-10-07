// node scripts/vault-l3-shots.cjs  (preview must be running on 8904): taps the crystal 10 times and screenshots each stage.
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch(),ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true}),pg=await ctx.newPage();
 const logs=[];pg.on('console',m=>/error|warn/i.test(m.type())&&logs.push(m.text()));pg.on('pageerror',e=>logs.push(String(e)));
 await pg.goto('http://127.0.0.1:'+(process.env.MYR5_L3_PORT||8904)+'/');await pg.waitForFunction('window.ready||window.errors.length',null,{timeout:30000});
 console.log('errors',await pg.evaluate('errors'));
 const shot=n=>pg.screenshot({path:`.vault/shots/l3-${n}.png`});
 for(let i=0;i<14;i++){await pg.evaluate('tap(190,560)');await pg.evaluate('skip(900)');} // warm the lazy crack-frame cache so the real run is not jank-bound
 await shot('01-initial');
 await pg.evaluate('chain(3)');await pg.evaluate('skip(400)');await pg.waitForTimeout(500);await shot('02-after-3-taps');await pg.evaluate('skip(2500)').then(()=>pg.waitForTimeout(700));
 await pg.evaluate('chain(9)');await pg.evaluate('skip(400)');await pg.waitForTimeout(500);await shot('03-after-9-taps');console.log('claims 1-9',await pg.evaluate('claimLog'));await pg.evaluate('skip(2500)').then(()=>pg.waitForTimeout(700));
 await pg.evaluate('chain(10)');
 for(const n of ['04a-shatter-0','04b-shatter-1','04c-shatter-2']){await pg.evaluate('skip(110)');await pg.waitForTimeout(700);await shot(n);}
 await pg.evaluate('skip(1500)');await pg.waitForTimeout(900);await shot('05-empty-face');
 console.log('secrets',await pg.evaluate('secrets'));
 await pg.evaluate('board.heal()');await pg.waitForTimeout(300);await shot('06-healed');
 console.log('console problems',logs);await b.close();
})();
