import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraConstraints,findUltrawide,widestZoom,cameraReport,openCamera} from '../camera.mjs';
test('Stop cancels a pending camera permission prompt and closes a late stream',async()=>{
  let resolve,stops=0;const controller=new AbortController();
  const devices={getUserMedia:()=>new Promise(r=>{resolve=r;})};
  const pending=openCamera('device:rear',30,devices,{signal:controller.signal});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});
  resolve({getTracks:()=>[{stop:()=>stops++}]});await new Promise(r=>setTimeout(r,0));assert.equal(stops,1);
  devices.getUserMedia=async()=> 'retry-stream';assert.equal(await openCamera('device:rear',30,devices),'retry-stream');
});
test('a permission prompt that never settles gives a retry message',async()=>{
  await assert.rejects(openCamera('device:rear',30,{getUserMedia:()=>new Promise(()=>{})},{timeoutMs:5}),/Allow camera access/);
});
test('cancellation during device discovery does not open the camera later',async()=>{
  let resolve,calls=0;const controller=new AbortController();
  const pending=openCamera('environment',30,{enumerateDevices:()=>new Promise(r=>{resolve=r;}),getUserMedia:()=>{calls++;}},{signal:controller.signal});
  controller.abort();await assert.rejects(pending,{name:'AbortError'});resolve([]);await new Promise(r=>setTimeout(r,0));assert.equal(calls,0);
});
test('an explicitly selected physical camera is exact, with no conflicting facing preference',()=>{const c=cameraConstraints('device:rear-wide-id');assert.deepEqual(c.video.deviceId,{exact:'rear-wide-id'});assert.equal(c.video.facingMode,undefined);assert.equal(c.video.resizeMode,'none');assert.equal(c.audio,false);});
test('ultrawide detection uses labels, never guesses from camera numbering',()=>{assert.equal(findUltrawide([{id:'0',label:'camera2 0, facing back'},{id:'2',label:'camera2 2, facing back'}]),undefined);assert.equal(findUltrawide([{id:'front',label:'front ultrawide'},{id:'rear',label:'Back Ultra Wide Camera'}]).id,'rear');});
test('widest view uses the advertised minimum and confirms the applied setting',async()=>{let zoom=1;const track={getCapabilities:()=>({zoom:{min:.6,max:8}}),getSettings:()=>({zoom}),applyConstraints:async c=>{zoom=c.advanced[0].zoom;}};const result=await widestZoom(track);assert.equal(zoom,.6);assert.equal(result.applied,true);});
test('unsupported or ignored zoom is not reported as a wider lens',async()=>{const unsupported=await widestZoom({getCapabilities:()=>({}),getSettings:()=>({})});assert.equal(unsupported.applied,false);const ignored=await widestZoom({getCapabilities:()=>({zoom:{min:.6,max:8}}),getSettings:()=>({zoom:1}),applyConstraints:async()=>{}});assert.equal(ignored.applied,false);});
test('local camera report excludes device identifiers and image data',()=>{const result=cameraReport({label:'Back camera',getSettings:()=>({deviceId:'private-id',groupId:'private-group',width:640,height:480})},[{id:'another-id',label:'Front camera'}],{supported:false});assert.equal(JSON.stringify(result).includes('private'),false);assert.deepEqual(result.lenses,['Front camera']);});
test('Back camera resolves the actual rear device rather than a soft preference',async()=>{let requested;const devices={enumerateDevices:async()=>[{kind:'videoinput',deviceId:'selfie',label:'camera 1, facing front'},{kind:'videoinput',deviceId:'rear',label:'camera 0, facing back'}],getUserMedia:async constraints=>{requested=constraints;return 'stream';}};assert.equal(await openCamera('environment',30,devices),'stream');assert.deepEqual(requested.video.deviceId,{exact:'rear'});assert.equal(requested.video.facingMode,undefined);});
