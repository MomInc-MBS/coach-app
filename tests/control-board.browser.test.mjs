// #106 workout selector board: the real pose.html board markup + pod/control-board.css + pod/hardware.mjs,
// driven by keyboard and pointer in Edge. Checks each control is a working ARIA widget on the same #movement state.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {detentAngle,detentFor} from '../pod/hardware.mjs';
import {GROUP_EXERCISES} from '../exercise-library.mjs';

test('rotary detents sweep 270° and a relative turn snaps to the nearest detent',()=>{
 assert.equal(detentAngle(0,10),-135);assert.equal(detentAngle(9,10),135);assert.equal(detentAngle(0,1),0);
 assert.equal(detentFor(0,30,10),1);assert.equal(detentFor(0,14,10),0);assert.equal(detentFor(3,-1000,10),0);assert.equal(detentFor(3,1000,7),6);
 assert.equal(detentFor(1,-44,7),0);assert.equal(detentFor(0,0,1),0);
});

test('control board: dial, knob, lever and switch work by keyboard and pointer, and lock during a set',async()=>{
 const root=resolve('.'),pose=await readFile('pose.html','utf8');
 const board=pose.slice(pose.indexOf('<div class="control-board'),pose.indexOf('<p>During camera workouts'));
 assert.ok(board.includes('id="exerciseDial"')&&board.includes('id="toggleVoice"'),'board markup found in pose.html');
 const harness=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/pod/pod.css"><link rel="stylesheet" href="/focus-library.css"><link rel="stylesheet" href="/pod/control-board.css">
<main class="pod-page"><section id="controls" class="workout-console">${board}</section></main>
<select id="goal"><option value="5">5 reps</option><option value="10">10 reps</option></select><input id="goalSlider" type="range"><output id="goalSetting"></output><span id="goalMin"></span><span id="goalMax"></span>
<script type="module">
import {EXERCISES,GROUP_EXERCISES} from '/exercise-library.mjs';import {initHardware} from '/pod/hardware.mjs';
const select=document.getElementById('movement');for(const id of Object.keys(EXERCISES))select.add(new Option(EXERCISES[id].name,id));select.value=GROUP_EXERCISES.chest[0].id;
window.changes=0;select.addEventListener('change',()=>window.changes++);
const sound=document.getElementById('toggleVoice');sound.addEventListener('click',()=>{const on=sound.dataset.on!=='true';sound.dataset.on=String(on);sound.setAttribute('aria-checked',String(on));sound.textContent=on?'ON':'OFF';});
initHardware();window.ready=true;
</script>`;
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/__board__'){res.writeHead(200,{'Content-Type':'text/html'});res.end(harness);return;}
  try{const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error();const body=await readFile(file);res.writeHead(200,{'Content-Type':({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:375,height:812}});
  await page.goto(`http://127.0.0.1:${server.address().port}/__board__`);await page.waitForFunction(()=>window.ready);
  const state=()=>page.evaluate(()=>{const a=(id,n)=>document.getElementById(id).getAttribute(n);return {movement:document.getElementById('movement').value,dial:a('exerciseDial','aria-valuenow'),dialText:a('exerciseDial','aria-valuetext'),knob:a('difficultySlider','aria-valuenow'),knobMax:a('difficultySlider','aria-valuemax'),knobText:a('difficultySlider','aria-valuetext'),readout:document.getElementById('difficultySetting').textContent,sound:a('toggleVoice','aria-checked'),changes:window.changes};});
  const chest=GROUP_EXERCISES.chest,legs=GROUP_EXERCISES.legs;
  assert.deepEqual((({dial,dialText,knob,knobMax})=>({dial,dialText,knob,knobMax}))(await state()),{dial:'0',dialText:'Chest',knob:'1',knobMax:String(chest.length)});

  // Roles and names, and a visible focus ring when reached by keyboard.
  assert.equal(await page.getAttribute('#exerciseDial','role'),'slider');assert.equal(await page.getAttribute('#difficultySlider','role'),'slider');assert.equal(await page.getAttribute('#toggleVoice','role'),'switch');
  await page.focus('#openLibrary');await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'exerciseDial');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid','keyboard focus shows a ring');

  // Focus dial: arrows step one section, End/Home jump, each commit is one change event.
  await page.keyboard.press('ArrowRight');let s=await state();
  assert.equal(s.dial,'1');assert.equal(s.dialText,'Legs');assert.equal(s.movement,legs[0].id);assert.equal(s.changes,1);
  await page.keyboard.press('End');assert.equal((await state()).dialText,'Cardio');
  await page.keyboard.press('Home');assert.equal((await state()).dialText,'Chest');

  // Level knob: arrows/End pick the level inside the focus section.
  await page.focus('#difficultySlider');await page.keyboard.press('ArrowUp');s=await state();
  assert.equal(s.knob,'2');assert.equal(s.movement,chest[1].id);assert.equal(s.readout,`LV 2/${chest.length}`);assert.match(s.knobText,new RegExp(`level 2 of ${chest.length}`));
  await page.keyboard.press('End');assert.equal((await state()).movement,chest.at(-1).id);
  await page.keyboard.press('Home');assert.equal((await state()).movement,chest[0].id);

  // Lever: Enter on HARDER, Space on EASIER, arrows on either end.
  await page.focus('#harder');await page.keyboard.press('Enter');assert.equal((await state()).knob,'2');
  await page.keyboard.press('ArrowUp');assert.equal((await state()).knob,'3');
  await page.focus('#easier');await page.keyboard.press('Space');assert.equal((await state()).knob,'2');
  await page.keyboard.press('ArrowDown');assert.equal((await state()).knob,'1');

  // Sound switch: arrows set it, Space toggles it.
  await page.focus('#toggleVoice');await page.keyboard.press('ArrowDown');assert.equal((await state()).sound,'false');
  await page.keyboard.press('ArrowDown');assert.equal((await state()).sound,'false','down again stays off');
  await page.keyboard.press('Space');assert.equal((await state()).sound,'true');

  // Pointer: turning the dial ~65° clockwise lands two detents on; a tap on its left side steps back one.
  const box=await page.locator('#exerciseDial').boundingBox(),cx=box.x+box.width/2,cy=box.y+box.height/2,r=box.width/2;
  const at=deg=>[cx+Math.sin(deg*Math.PI/180)*r*.8,cy-Math.cos(deg*Math.PI/180)*r*.8];
  const before=(await state()).changes;
  await page.mouse.move(...at(-135));await page.mouse.down();for(let a=-130;a<=-70;a+=10)await page.mouse.move(...at(a));
  assert.equal((await state()).changes,before,'no commit while turning');await page.mouse.up();
  assert.equal((await state()).dialText,'Hips & glutes');
  await page.mouse.click(box.x+6,cy);assert.equal((await state()).dialText,'Legs');
  // Lever throw: drag the handle up and let go.
  const lever=await page.locator('.cb-lever').boundingBox(),lx=lever.x+lever.width/2,ly=lever.y+lever.height/2;
  await page.mouse.move(lx,ly);await page.mouse.down();await page.mouse.move(lx,ly-12);await page.mouse.move(lx,ly-24);await page.mouse.up();
  assert.equal((await state()).knob,'2');

  // During a set (#goal disabled) the board locks.
  await page.evaluate(()=>{document.getElementById('goal').disabled=true;});await page.waitForFunction(()=>document.getElementById('exerciseDial').getAttribute('aria-disabled')==='true');
  const locked=await state();await page.focus('#exerciseDial');await page.keyboard.press('ArrowRight');
  assert.equal((await state()).movement,locked.movement);assert.equal(await page.isDisabled('#harder'),true);assert.equal(await page.getAttribute('#difficultySlider','aria-disabled'),'true');
 }finally{await browser?.close();server.close();}
});
