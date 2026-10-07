// node scripts/vault-l3-shots.cjs  (preview must be running on 8904): taps the crystal 10 times and screenshots each stage.
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}),ctx=await b.newContext({viewport:{width:375,height:812},hasTouch:true}),pg=await ctx.newPage();
 const logs=[];pg.on('console',m=>/error|warn/i.test(m.type())&&logs.push(m.text()));pg.on('pageerror',e=>logs.push(String(e)));
 await pg.goto('http://127.0.0.1:'+(process.env.MYR5_L3_PORT||8904)+'/');await pg.waitForFunction('window.ready||window.errors.length',null,{timeout:30000});
 console.log('errors',await pg.evaluate('errors'));
 const shot=n=>pg.screenshot({path:`.vault/shots/l3-${n}.png`}),pts=[[190,560],[110,430],[270,480],[150,650],[250,650],[120,540],[280,600],[190,450],[200,700],[190,580]];
 const tap=async(i)=>{const [x,y]=pts[i];await pg.mouse.move(x,y);await pg.mouse.down();await pg.waitForTimeout(60);await pg.mouse.up();};
 await shot('01-initial');
 const claims=[];
 for(let i=0;i<9;i++){await tap(i);claims.push(await pg.evaluate('window.lastClaim'));await pg.waitForTimeout(300);if(i===2)await shot('02-after-3-taps');if(i===8)await shot('03-after-9-taps');}
 console.log('claims per tap 1-9',claims);
 await tap(9);
 for(const [n,ms] of [['04a-shatter-0',60],['04b-shatter-1',250],['04c-shatter-2',400]]){await pg.waitForTimeout(ms);await shot(n);}
 await pg.waitForTimeout(1800);await pg.waitForTimeout(200);await shot('05-empty-face');
 console.log('secrets',await pg.evaluate('secrets'));
 await pg.evaluate('board.heal()');await pg.waitForTimeout(300);await shot('06-healed');
 console.log('console problems',logs);await b.close();
})();
