var Up=Object.defineProperty;var lt=(i,e)=>()=>(i&&(e=i(i=0)),e);var vi=(i,e)=>{for(var t in e)Up(i,t,{get:e[t],enumerable:!0})};function Mn(i,e,t,n,s={}){let r=s.kind??(["plank","sideplank","balance","yoga","stance"].includes(n)?"hold":n==="boxing"?"pace":n==="march"?"steps":"reps"),a=s.view??(["pushup","hinge","bridge","plank","split"].includes(n)?"side":"front"),o=r==="hold"?"Pose hold":r==="pace"?"Active hand time":r==="steps"?"Knee lifts":"Repetitions",c=s.limits??"Counts the visible movement; does not grade technique.",l=a==="side"?"Camera beside you.":a==="angle"?"Camera at a slight angle.":"Face the camera.";Os.push({id:e,group:i,name:t,detector:n,kind:r,view:a,measurement:o,limits:c,difficulty:Os.filter(h=>h.group===i).length+1,defaultGoal:r==="hold"||r==="pace"?15:5,evidence:"rule-based; camera validation pending",source:"mediapipe",...s,hint:`${l} ${s.cue??"Keep the joints used for this movement visible."}`})}function Gi(i){return Rt[i]?.group??"cardio"}function Uo(i,e){let t=xi[i]??xi.chest;return t[Math.max(0,Math.min(t.length-1,Math.round(Number(e)||0)))]}var wt,Os,kp,Rt,xi,Tb,Kn=lt(()=>{wt=[{id:"chest",name:"Chest",description:"Push-up progressions"},{id:"legs",name:"Legs",description:"Squats and split squats"},{id:"hips",name:"Hips & glutes",description:"Hinges and bridges"},{id:"core",name:"Core",description:"Plank holds"},{id:"shoulders",name:"Shoulders",description:"Controlled arm movement"},{id:"balance",name:"Balance",description:"Single-leg yoga holds"},{id:"yoga",name:"Yoga",description:"Standing poses"},{id:"stances",name:"Martial stances",description:"Controlled stance holds"},{id:"boxing",name:"Boxing",description:"Slow shadowboxing"},{id:"cardio",name:"Cardio",description:"Marches and jacks"}],Os=[];kp="Counts elbow bend and return. Hand shape, support stability and chest depth are not verified.";for(let[i,e,t]of[["knee-pushup","Knee push-up",{support:"knees",cue:"Knees down; show shoulder, elbow, wrist and hip."}],["high-incline-pushup","High incline push-up",{incline:!0,cue:"Hands on a stable high surface; show your full arm and torso."}],["low-incline-pushup","Low incline push-up",{incline:!0,cue:"Hands on a stable lower surface; show your full arm and torso."}],["pushup","Regular push-up",{}],["wide-pushup","Wide push-up",{wide:!0}],["slow-pushup","Slow push-up",{minCycle:1.2}],["diamond-pushup","Diamond push-up",{narrow:!0}],["decline-pushup","Feet-elevated push-up",{decline:!0,cue:"Feet on a stable low surface; show your full arm and torso."}]])Mn("chest",i,e,"pushup",{cue:"Show shoulder, elbow, wrist and hip. Start with your arm extended.",limits:kp,...t});for(let[i,e,t]of[["shallow-squat","Shallow squat",{travel:.18}],["squat","Bodyweight squat",{}],["wide-squat","Wide squat",{wide:!0}],["pause-squat","Pause squat",{dwell:.8}],["slow-squat","Slow squat",{minCycle:1.2}],["split-left","Split squat \xB7 left",{detector:"split",side:"left"}],["split-right","Split squat \xB7 right",{detector:"split",side:"right"}]])Mn("legs",i,e,t.detector??"squat",{cue:t.side?"Show the front leg from hip to knee. Start tall.":"Show shoulders and hips. Start standing tall.",...t});for(let[i,e,t,n]of[["small-hinge","Small hip hinge","hinge",{bend:25}],["hip-hinge","Hip hinge","hinge",{}],["good-morning","Bodyweight good morning","hinge",{arms:"chest"}],["glute-bridge","Glute bridge","bridge",{}],["pause-bridge","Pause glute bridge","bridge",{dwell:.8}]])Mn("hips",i,e,t,{cue:t==="bridge"?"Lie on your back, knees bent. Show shoulder, hip and knee. Start with hips down.":"Show shoulder, hip and knee. Start upright; hinge slowly.",limits:"Tracks hip movement. Back curvature and muscle engagement are not verified.",...n});for(let[i,e,t]of[["knee-plank","Knee plank",{support:"knees"}],["high-plank","High plank",{}],["forearm-plank","Forearm plank",{forearm:!0}],["side-knee-left","Side knee plank \xB7 left",{side:"left",support:"knees"}],["side-knee-right","Side knee plank \xB7 right",{side:"right",support:"knees"}],["side-plank-left","Side plank \xB7 left",{side:"left"}],["side-plank-right","Side plank \xB7 right",{side:"right"}]])Mn("core",i,e,t.side?"sideplank":"plank",{view:t.side?"front":"side",cue:t.side?"Show both shoulders, hips and the supporting knee. Stack your shoulders.":"Show shoulder, elbow, wrist, hip and supporting knee.",limits:"Times the shoulder\u2013hip\u2013knee line. Feet, floor contact and loading are not tracked.",...t});for(let[i,e,t,n]of[["front-raise","Front arm raise","raise",{view:"side",plane:"front"}],["lateral-raise","Lateral arm raise","raise",{}],["overhead-reach","Overhead reach","raise",{overhead:!0}],["standing-press","Standing arm press","press",{}],["slow-press","Slow arm press","press",{minCycle:1.2}]])Mn("shoulders",i,e,t,{cue:"Keep both shoulders, elbows, wrists and hips visible. Use controlled, unloaded movement.",...n});for(let[i,e,t]of[["knee-balance","Knee-lift balance",{kneeLift:!0}],["low-tree","Low tree pose",{low:!0}],["tree","Tree pose",{}],["overhead-tree","Tree \xB7 arms overhead",{overhead:!0}]])Mn("balance",i,e,"balance",{cue:"Show both hips and knees. Either leg works; keep a support nearby if needed.",limits:"Times the visible leg shape. Balance, foot pressure and support use are not verified.",...t});for(let[i,e,t]of[["mountain","Mountain","mountain"],["salute","Upward salute","salute"],["chair","Chair pose","chair"],["warrior-one","Warrior I","warrior-one"],["warrior","Warrior II","warrior"],["goddess","Goddess pose","goddess"]])Mn("yoga",i,e,"yoga",{pose:t,view:["chair","warrior-one"].includes(t)?"side":"front",cue:"Show arms, hips and knees. Hold only a comfortable position.",limits:"Times broad pose shape. Foot rotation and joint alignment are not graded."});for(let[i,e,t]of[["high-horse","High horse stance",{high:!0}],["horse","Horse stance",{}],["low-horse","Lower horse stance",{low:!0}],["front-stance-left","Front stance \xB7 left",{side:"left"}],["front-stance-right","Front stance \xB7 right",{side:"right"}]])Mn("stances",i,e,"stance",{view:t.side?"side":"front",cue:"Keep hips and knees visible. Move slowly into a comfortable stance.",limits:"Times stance shape only. This is not martial-arts technique instruction.",...t});for(let[i,e,t]of[["jab-left","Left straight practice",{side:"left"}],["jab-right","Right straight practice",{side:"right"}],["boxing","Alternating straights",{}],["double-jab","Double-jab practice",{double:!0}]])Mn("boxing",i,e,"boxing",{view:"angle",cue:"Show shoulders, elbows, wrists and hips. Practice slow, controlled punches into empty space.",limits:"Tracks active hand time and relative pace. Punch type, power, accuracy and guard are not verified.",...t});for(let[i,e,t,n]of[["march","Easy march","march",{}],["high-march","High-knee march","march",{lift:.4}],["jogging","Jog in place","march",{}],["step-jack","Step jack","jack",{step:!0}],["jumping-jack","Jumping jack","jack",{}]])Mn("cardio",i,e,t,{cue:t==="jack"?"Show your upper body and knees. Start with arms down and knees close together.":"Show shoulders, hips and both knees. Start standing tall.",limits:t==="jack"?"Counts arm-and-knee opening cycles. Feet, airtime and landings are not tracked.":"Counts knee lifts. Footfalls and impact are not verified.",...n});Rt=Object.freeze(Object.fromEntries(Os.map(i=>[i.id,Object.freeze(i)]))),xi=Object.freeze(Object.fromEntries(wt.map(i=>[i.id,Object.freeze(Os.filter(e=>e.group===i.id))]))),Tb=Os.length});function xn(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Nt[i&255]+Nt[i>>8&255]+Nt[i>>16&255]+Nt[i>>24&255]+"-"+Nt[e&255]+Nt[e>>8&255]+"-"+Nt[e>>16&15|64]+Nt[e>>24&255]+"-"+Nt[t&63|128]+Nt[t>>8&255]+"-"+Nt[t>>16&255]+Nt[t>>24&255]+Nt[n&255]+Nt[n>>8&255]+Nt[n>>16&255]+Nt[n>>24&255]).toLowerCase()}function It(i,e,t){return Math.max(e,Math.min(t,i))}function zl(i,e){return(i%e+e)%e}function Dm(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Um(i,e,t){return i!==e?(t-i)/(e-i):0}function Zs(i,e,t){return(1-t)*i+t*e}function km(i,e,t,n){return Zs(i,e,1-Math.exp(-t*n))}function Om(i,e=1){return e-Math.abs(zl(i,e*2)-e)}function Fm(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Bm(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function zm(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Hm(i,e){return i+Math.random()*(e-i)}function Vm(i){return i*(.5-Math.random())}function Gm(i){i!==void 0&&(Au=i);let e=Au+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Wm(i){return i*Ks}function Xm(i){return i*xs}function qm(i){return(i&i-1)===0&&i!==0}function Ym(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function $m(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function jm(i,e,t,n,s){let r=Math.cos,a=Math.sin,o=r(t/2),c=a(t/2),l=r((e+n)/2),h=a((e+n)/2),u=r((e-n)/2),d=a((e-n)/2),f=r((n-e)/2),g=a((n-e)/2);switch(s){case"XYX":i.set(o*h,c*u,c*d,o*l);break;case"YZY":i.set(c*d,o*h,c*u,o*l);break;case"ZXZ":i.set(c*u,c*d,o*h,o*l);break;case"XZX":i.set(o*h,c*g,c*f,o*l);break;case"YXY":i.set(c*f,o*h,c*g,o*l);break;case"ZYZ":i.set(c*g,c*f,o*h,o*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function _n(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("Invalid component type.")}}function tt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("Invalid component type.")}}function qd(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function tr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Km(){let i=tr("canvas");return i.style.display="block",i}function aa(i){i in Tu||(Tu[i]=!0,console.warn(i))}function Zm(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}function Jm(i){let e=i.elements;e[2]=.5*e[2]+.5*e[3],e[6]=.5*e[6]+.5*e[7],e[10]=.5*e[10]+.5*e[11],e[14]=.5*e[14]+.5*e[15]}function Qm(i){let e=i.elements;e[11]===-1?(e[10]=-e[10]-1,e[14]=-e[14]):(e[10]=-e[10],e[14]=-e[14]+1)}function us(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function zo(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}function Ho(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?tl.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}function Go(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){wi.fromArray(i,r);let o=s.x*Math.abs(wi.x)+s.y*Math.abs(wi.y)+s.z*Math.abs(wi.z),c=e.dot(wi),l=t.dot(wi),h=n.dot(wi);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}function nc(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}function dg(i,e,t,n,s,r,a,o){let c;if(e.side===qt?c=n.intersectTriangle(a,r,s,!0,o):c=n.intersectTriangle(s,r,a,e.side===En,o),c===null)return null;Vr.copy(o),Vr.applyMatrix4(i.matrixWorld);let l=t.ray.origin.distanceTo(Vr);return l<t.near||l>t.far?null:{distance:l,point:Vr.clone(),object:i}}function Gr(i,e,t,n,s,r,a,o,c,l){i.getVertexPosition(o,Fr),i.getVertexPosition(c,Br),i.getVertexPosition(l,zr);let h=dg(i,e,t,n,Fr,Br,zr,Hu);if(h){let u=new O;Ii.getBarycoord(Hu,Fr,Br,zr,u),s&&(h.uv=Ii.getInterpolatedAttribute(s,o,c,l,u,new Te)),r&&(h.uv1=Ii.getInterpolatedAttribute(r,o,c,l,u,new Te)),a&&(h.normal=Ii.getInterpolatedAttribute(a,o,c,l,u,new O),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let d={a:o,b:c,c:l,normal:new O,materialIndex:0};Ii.getNormal(Fr,Br,zr,d.normal),h.face=d,h.barycoord=u}return h}function bs(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone():Array.isArray(s)?e[t][n]=s.slice():e[t][n]=s}}return e}function Ft(i){let e={};for(let t=0;t<i.length;t++){let n=bs(i[t]);for(let s in n)e[s]=n[s]}return e}function fg(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function $d(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:qe.workingColorSpace}function jd(){let i=null,e=!1,t=null,n=null;function s(r,a){t(r,a),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function vg(i){let e=new WeakMap;function t(o,c){let l=o.array,h=o.usage,u=l.byteLength,d=i.createBuffer();i.bindBuffer(c,d),i.bufferData(c,l,h),o.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:d,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:u}}function n(o,c,l){let h=c.array,u=c.updateRanges;if(i.bindBuffer(l,o),u.length===0)i.bufferSubData(l,0,h);else{u.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<u.length;f++){let g=u[d],y=u[f];y.start<=g.start+g.count+1?g.count=Math.max(g.count,y.start+y.count-g.start):(++d,u[d]=y)}u.length=d+1;for(let f=0,g=u.length;f<g;f++){let y=u[f];i.bufferSubData(l,y.start*h.BYTES_PER_ELEMENT,h,y.start,y.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:s,remove:r,update:a}}function e_(i,e,t,n,s,r,a){let o=new Ie(0),c=r===!0?0:1,l,h,u=null,d=0,f=null;function g(_){let x=_.isScene===!0?_.background:null;return x&&x.isTexture&&(x=(_.backgroundBlurriness>0?t:e).get(x)),x}function y(_){let x=!1,b=g(_);b===null?m(o,c):b&&b.isColor&&(m(b,1),x=!0);let C=i.xr.getEnvironmentBlendMode();C==="additive"?n.buffers.color.setClear(0,0,0,1,a):C==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(i.autoClear||x)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function p(_,x){let b=g(x);b&&(b.isCubeTexture||b.mapping===Xa)?(h===void 0&&(h=new gt(new nr(1,1,1),new Rn({name:"BackgroundCubeMaterial",uniforms:bs(wn.backgroundCube.uniforms),vertexShader:wn.backgroundCube.vertexShader,fragmentShader:wn.backgroundCube.fragmentShader,side:qt,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(C,A,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),Ai.copy(x.backgroundRotation),Ai.x*=-1,Ai.y*=-1,Ai.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Ai.y*=-1,Ai.z*=-1),h.material.uniforms.envMap.value=b,h.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=x.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(Qy.makeRotationFromEuler(Ai)),h.material.toneMapped=qe.getTransfer(b.colorSpace)!==ct,(u!==b||d!==b.version||f!==i.toneMapping)&&(h.material.needsUpdate=!0,u=b,d=b.version,f=i.toneMapping),h.layers.enableAll(),_.unshift(h,h.geometry,h.material,0,0,null)):b&&b.isTexture&&(l===void 0&&(l=new gt(new va(2,2),new Rn({name:"BackgroundMaterial",uniforms:bs(wn.background.uniforms),vertexShader:wn.background.vertexShader,fragmentShader:wn.background.fragmentShader,side:En,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=b,l.material.uniforms.backgroundIntensity.value=x.backgroundIntensity,l.material.toneMapped=qe.getTransfer(b.colorSpace)!==ct,b.matrixAutoUpdate===!0&&b.updateMatrix(),l.material.uniforms.uvTransform.value.copy(b.matrix),(u!==b||d!==b.version||f!==i.toneMapping)&&(l.material.needsUpdate=!0,u=b,d=b.version,f=i.toneMapping),l.layers.enableAll(),_.unshift(l,l.geometry,l.material,0,0,null))}function m(_,x){_.getRGB(Xr,$d(i)),n.buffers.color.setClear(Xr.r,Xr.g,Xr.b,x,a)}return{getClearColor:function(){return o},setClearColor:function(_,x=1){o.set(_),c=x,m(o,c)},getClearAlpha:function(){return c},setClearAlpha:function(_){c=_,m(o,c)},render:y,addToRenderList:p}}function t_(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,a=!1;function o(v,M,L,U,I){let R=!1,P=u(U,L,M);r!==P&&(r=P,l(r.object)),R=f(v,U,L,I),R&&g(v,U,L,I),I!==null&&e.update(I,i.ELEMENT_ARRAY_BUFFER),(R||a)&&(a=!1,b(v,M,L,U),I!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(I).buffer))}function c(){return i.createVertexArray()}function l(v){return i.bindVertexArray(v)}function h(v){return i.deleteVertexArray(v)}function u(v,M,L){let U=L.wireframe===!0,I=n[v.id];I===void 0&&(I={},n[v.id]=I);let R=I[M.id];R===void 0&&(R={},I[M.id]=R);let P=R[U];return P===void 0&&(P=d(c()),R[U]=P),P}function d(v){let M=[],L=[],U=[];for(let I=0;I<t;I++)M[I]=0,L[I]=0,U[I]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:M,enabledAttributes:L,attributeDivisors:U,object:v,attributes:{},index:null}}function f(v,M,L,U){let I=r.attributes,R=M.attributes,P=0,$=L.getAttributes();for(let V in $)if($[V].location>=0){let Y=I[V],se=R[V];if(se===void 0&&(V==="instanceMatrix"&&v.instanceMatrix&&(se=v.instanceMatrix),V==="instanceColor"&&v.instanceColor&&(se=v.instanceColor)),Y===void 0||Y.attribute!==se||se&&Y.data!==se.data)return!0;P++}return r.attributesNum!==P||r.index!==U}function g(v,M,L,U){let I={},R=M.attributes,P=0,$=L.getAttributes();for(let V in $)if($[V].location>=0){let Y=R[V];Y===void 0&&(V==="instanceMatrix"&&v.instanceMatrix&&(Y=v.instanceMatrix),V==="instanceColor"&&v.instanceColor&&(Y=v.instanceColor));let se={};se.attribute=Y,Y&&Y.data&&(se.data=Y.data),I[V]=se,P++}r.attributes=I,r.attributesNum=P,r.index=U}function y(){let v=r.newAttributes;for(let M=0,L=v.length;M<L;M++)v[M]=0}function p(v){m(v,0)}function m(v,M){let L=r.newAttributes,U=r.enabledAttributes,I=r.attributeDivisors;L[v]=1,U[v]===0&&(i.enableVertexAttribArray(v),U[v]=1),I[v]!==M&&(i.vertexAttribDivisor(v,M),I[v]=M)}function _(){let v=r.newAttributes,M=r.enabledAttributes;for(let L=0,U=M.length;L<U;L++)M[L]!==v[L]&&(i.disableVertexAttribArray(L),M[L]=0)}function x(v,M,L,U,I,R,P){P===!0?i.vertexAttribIPointer(v,M,L,I,R):i.vertexAttribPointer(v,M,L,U,I,R)}function b(v,M,L,U){y();let I=U.attributes,R=L.getAttributes(),P=M.defaultAttributeValues;for(let $ in R){let V=R[$];if(V.location>=0){let k=I[$];if(k===void 0&&($==="instanceMatrix"&&v.instanceMatrix&&(k=v.instanceMatrix),$==="instanceColor"&&v.instanceColor&&(k=v.instanceColor)),k!==void 0){let Y=k.normalized,se=k.itemSize,Se=e.get(k);if(Se===void 0)continue;let Ve=Se.buffer,Z=Se.type,ie=Se.bytesPerElement,B=Z===i.INT||Z===i.UNSIGNED_INT||k.gpuType===Pl;if(k.isInterleavedBufferAttribute){let G=k.data,ce=G.stride,ge=k.offset;if(G.isInstancedInterleavedBuffer){for(let Ue=0;Ue<V.locationSize;Ue++)m(V.location+Ue,G.meshPerAttribute);v.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=G.meshPerAttribute*G.count)}else for(let Ue=0;Ue<V.locationSize;Ue++)p(V.location+Ue);i.bindBuffer(i.ARRAY_BUFFER,Ve);for(let Ue=0;Ue<V.locationSize;Ue++)x(V.location+Ue,se/V.locationSize,Z,Y,ce*ie,(ge+se/V.locationSize*Ue)*ie,B)}else{if(k.isInstancedBufferAttribute){for(let G=0;G<V.locationSize;G++)m(V.location+G,k.meshPerAttribute);v.isInstancedMesh!==!0&&U._maxInstanceCount===void 0&&(U._maxInstanceCount=k.meshPerAttribute*k.count)}else for(let G=0;G<V.locationSize;G++)p(V.location+G);i.bindBuffer(i.ARRAY_BUFFER,Ve);for(let G=0;G<V.locationSize;G++)x(V.location+G,se/V.locationSize,Z,Y,se*ie,se/V.locationSize*G*ie,B)}}else if(P!==void 0){let Y=P[$];if(Y!==void 0)switch(Y.length){case 2:i.vertexAttrib2fv(V.location,Y);break;case 3:i.vertexAttrib3fv(V.location,Y);break;case 4:i.vertexAttrib4fv(V.location,Y);break;default:i.vertexAttrib1fv(V.location,Y)}}}}_()}function C(){N();for(let v in n){let M=n[v];for(let L in M){let U=M[L];for(let I in U)h(U[I].object),delete U[I];delete M[L]}delete n[v]}}function A(v){if(n[v.id]===void 0)return;let M=n[v.id];for(let L in M){let U=M[L];for(let I in U)h(U[I].object),delete U[I];delete M[L]}delete n[v.id]}function E(v){for(let M in n){let L=n[M];if(L[v.id]===void 0)continue;let U=L[v.id];for(let I in U)h(U[I].object),delete U[I];delete L[v.id]}}function N(){j(),a=!0,r!==s&&(r=s,l(r.object))}function j(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:N,resetDefaultState:j,dispose:C,releaseStatesOfGeometry:A,releaseStatesOfProgram:E,initAttributes:y,enableAttribute:p,disableUnusedAttributes:_}}function n_(i,e,t){let n;function s(l){n=l}function r(l,h){i.drawArrays(n,l,h),t.update(h,n,1)}function a(l,h,u){u!==0&&(i.drawArraysInstanced(n,l,h,u),t.update(h,n,u))}function o(l,h,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,h,0,u);let f=0;for(let g=0;g<u;g++)f+=h[g];t.update(f,n,1)}function c(l,h,u,d){if(u===0)return;let f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<l.length;g++)a(l[g],h[g],d[g]);else{f.multiDrawArraysInstancedWEBGL(n,l,0,h,0,d,0,u);let g=0;for(let y=0;y<u;y++)g+=h[y];for(let y=0;y<d.length;y++)t.update(g,n,d[y])}}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=c}function i_(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let E=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(E){return!(E!==hn&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(E){let N=E===fr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(E!==Hn&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==vn&&!N)}function c(E){if(E==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp",h=c(l);h!==l&&(console.warn("THREE.WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let u=t.logarithmicDepthBuffer===!0,d=t.reverseDepthBuffer===!0&&e.has("EXT_clip_control");if(d===!0){let E=e.get("EXT_clip_control");E.clipControlEXT(E.LOWER_LEFT_EXT,E.ZERO_TO_ONE_EXT)}let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),_=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),x=i.getParameter(i.MAX_VARYING_VECTORS),b=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),C=g>0,A=i.getParameter(i.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:u,reverseDepthBuffer:d,maxTextures:f,maxVertexTextures:g,maxTextureSize:y,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:_,maxVaryings:x,maxFragmentUniforms:b,vertexTextures:C,maxSamples:A}}function s_(i){let e=this,t=null,n=0,s=!1,r=!1,a=new yn,o=new Be,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||n!==0||s;return s=d,n=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){let g=u.clippingPlanes,y=u.clipIntersection,p=u.clipShadows,m=i.get(u);if(!s||g===null||g.length===0||r&&!p)r?h(null):l();else{let _=r?0:n,x=_*4,b=m.clippingState||null;c.value=b,b=h(g,d,x,f);for(let C=0;C!==x;++C)b[C]=t[C];m.clippingState=b,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=_}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(u,d,f,g){let y=u!==null?u.length:0,p=null;if(y!==0){if(p=c.value,g!==!0||p===null){let m=f+y*4,_=d.matrixWorldInverse;o.getNormalMatrix(_),(p===null||p.length<m)&&(p=new Float32Array(m));for(let x=0,b=f;x!==y;++x,b+=4)a.copy(u[x]).applyMatrix4(_,o),a.normal.toArray(p,b),p[b+3]=a.constant}c.value=p,c.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,p}}function r_(i){let e=new WeakMap;function t(a,o){return o===Ac?a.mapping=ps:o===Tc&&(a.mapping=ms),a}function n(a){if(a&&a.isTexture){let o=a.mapping;if(o===Ac||o===Tc)if(e.has(a)){let c=e.get(a).texture;return t(c,a.mapping)}else{let c=a.image;if(c&&c.height>0){let l=new rl(c.height);return l.fromEquirectangularTexture(i,a),e.set(a,l),a.addEventListener("dispose",s),t(l.texture,a.mapping)}else return null}}return a}function s(a){let o=a.target;o.removeEventListener("dispose",s);let c=e.get(o);c!==void 0&&(e.delete(o),c.dispose())}function r(){e=new WeakMap}return{get:n,dispose:r}}function a_(i){let e=[],t=[],n=[],s=i,r=i-cs+1+Wu.length;for(let a=0;a<r;a++){let o=Math.pow(2,s);t.push(o);let c=1/o;a>i-cs?c=Wu[a-i+cs-1]:a===0&&(c=0),n.push(c);let l=1/(o-2),h=-l,u=1+l,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,y=3,p=2,m=1,_=new Float32Array(y*g*f),x=new Float32Array(p*g*f),b=new Float32Array(m*g*f);for(let A=0;A<f;A++){let E=A%3*2/3-1,N=A>2?0:-1,j=[E,N,0,E+2/3,N,0,E+2/3,N+1,0,E,N,0,E+2/3,N+1,0,E,N+1,0];_.set(j,y*g*A),x.set(d,p*g*A);let v=[A,A,A,A,A,A];b.set(v,m*g*A)}let C=new zt;C.setAttribute("position",new vt(_,y)),C.setAttribute("uv",new vt(x,p)),C.setAttribute("faceIndex",new vt(b,m)),e.push(C),s>cs&&s--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function Yu(i,e,t){let n=new Vn(i,e,t);return n.texture.mapping=Xa,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function qr(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function o_(i,e,t){let n=new Float32Array(Pi),s=new O(0,1,0);return new Rn({name:"SphericalGaussianBlur",defines:{n:Pi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Hl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:ri,depthTest:!1,depthWrite:!1})}function $u(){return new Rn({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Hl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ri,depthTest:!1,depthWrite:!1})}function ju(){return new Rn({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Hl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ri,depthTest:!1,depthWrite:!1})}function Hl(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function c_(i){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){let c=o.mapping,l=c===Ac||c===Tc,h=c===ps||c===ms;if(l||h){let u=e.get(o),d=u!==void 0?u.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==d)return t===null&&(t=new xa(i)),u=l?t.fromEquirectangular(o,u):t.fromCubemap(o,u),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),u.texture;if(u!==void 0)return u.texture;{let f=o.image;return l&&f&&f.height>0||h&&f&&s(f)?(t===null&&(t=new xa(i)),u=l?t.fromEquirectangular(o):t.fromCubemap(o),u.texture.pmremVersion=o.pmremVersion,e.set(o,u),o.addEventListener("dispose",r),u.texture):null}}}return o}function s(o){let c=0,l=6;for(let h=0;h<l;h++)o[h]!==void 0&&c++;return c===l}function r(o){let c=o.target;c.removeEventListener("dispose",r);let l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function l_(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s;switch(n){case"WEBGL_depth_texture":s=i.getExtension("WEBGL_depth_texture")||i.getExtension("MOZ_WEBGL_depth_texture")||i.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=i.getExtension("EXT_texture_filter_anisotropic")||i.getExtension("MOZ_EXT_texture_filter_anisotropic")||i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=i.getExtension("WEBGL_compressed_texture_s3tc")||i.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=i.getExtension("WEBGL_compressed_texture_pvrtc")||i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=i.getExtension(n)}return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&aa("THREE.WebGLRenderer: "+n+" extension not supported."),s}}}function h_(i,e,t,n){let s={},r=new WeakMap;function a(u){let d=u.target;d.index!==null&&e.remove(d.index);for(let g in d.attributes)e.remove(d.attributes[g]);for(let g in d.morphAttributes){let y=d.morphAttributes[g];for(let p=0,m=y.length;p<m;p++)e.remove(y[p])}d.removeEventListener("dispose",a),delete s[d.id];let f=r.get(d);f&&(e.remove(f),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(u,d){return s[d.id]===!0||(d.addEventListener("dispose",a),s[d.id]=!0,t.memory.geometries++),d}function c(u){let d=u.attributes;for(let g in d)e.update(d[g],i.ARRAY_BUFFER);let f=u.morphAttributes;for(let g in f){let y=f[g];for(let p=0,m=y.length;p<m;p++)e.update(y[p],i.ARRAY_BUFFER)}}function l(u){let d=[],f=u.index,g=u.attributes.position,y=0;if(f!==null){let _=f.array;y=f.version;for(let x=0,b=_.length;x<b;x+=3){let C=_[x+0],A=_[x+1],E=_[x+2];d.push(C,A,A,E,E,C)}}else if(g!==void 0){let _=g.array;y=g.version;for(let x=0,b=_.length/3-1;x<b;x+=3){let C=x+0,A=x+1,E=x+2;d.push(C,A,A,E,E,C)}}else return;let p=new(qd(d)?ga:ma)(d,1);p.version=y;let m=r.get(u);m&&e.remove(m),r.set(u,p)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&l(u)}else l(u);return r.get(u)}return{get:o,update:c,getWireframeAttribute:h}}function u_(i,e,t){let n;function s(d){n=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function c(d,f){i.drawElements(n,f,r,d*a),t.update(f,n,1)}function l(d,f,g){g!==0&&(i.drawElementsInstanced(n,f,r,d*a,g),t.update(f,n,g))}function h(d,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,f,0,r,d,0,g);let p=0;for(let m=0;m<g;m++)p+=f[m];t.update(p,n,1)}function u(d,f,g,y){if(g===0)return;let p=e.get("WEBGL_multi_draw");if(p===null)for(let m=0;m<d.length;m++)l(d[m]/a,f[m],y[m]);else{p.multiDrawElementsInstancedWEBGL(n,f,0,r,d,0,y,0,g);let m=0;for(let _=0;_<g;_++)m+=f[_];for(let _=0;_<y.length;_++)t.update(m,n,y[_])}}this.setMode=s,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h,this.renderMultiDrawInstances=u}function d_(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function f_(i,e,t){let n=new WeakMap,s=new Ke;function r(a,o,c){let l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=h!==void 0?h.length:0,d=n.get(o);if(d===void 0||d.count!==u){let j=function(){E.dispose(),n.delete(o),o.removeEventListener("dispose",j)};d!==void 0&&d.texture.dispose();let f=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,y=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],_=o.morphAttributes.color||[],x=0;f===!0&&(x=1),g===!0&&(x=2),y===!0&&(x=3);let b=o.attributes.position.count*x,C=1;b>e.maxTextureSize&&(C=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);let A=new Float32Array(b*C*4*u),E=new fa(A,b,C,u);E.type=vn,E.needsUpdate=!0;let N=x*4;for(let v=0;v<u;v++){let M=p[v],L=m[v],U=_[v],I=b*C*4*v;for(let R=0;R<M.count;R++){let P=R*N;f===!0&&(s.fromBufferAttribute(M,R),A[I+P+0]=s.x,A[I+P+1]=s.y,A[I+P+2]=s.z,A[I+P+3]=0),g===!0&&(s.fromBufferAttribute(L,R),A[I+P+4]=s.x,A[I+P+5]=s.y,A[I+P+6]=s.z,A[I+P+7]=0),y===!0&&(s.fromBufferAttribute(U,R),A[I+P+8]=s.x,A[I+P+9]=s.y,A[I+P+10]=s.z,A[I+P+11]=U.itemSize===4?s.w:1)}}d={count:u,texture:E,size:new Te(b,C)},n.set(o,d),o.addEventListener("dispose",j)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let f=0;for(let y=0;y<l.length;y++)f+=l[y];let g=o.morphTargetsRelative?1:1-f;c.getUniforms().setValue(i,"morphTargetBaseInfluence",g),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:r}}function p_(i,e,t,n){let s=new WeakMap;function r(c){let l=n.render.frame,h=c.geometry,u=e.get(c,h);if(s.get(u)!==l&&(e.update(u),s.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),s.get(c)!==l&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){let d=c.skeleton;s.get(d)!==l&&(d.update(),s.set(d,l))}return u}function a(){s=new WeakMap}function o(c){let l=c.target;l.removeEventListener("dispose",o),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:a}}function Ts(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Zu[s];if(r===void 0&&(r=new Float32Array(s),Zu[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function xt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function bt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function $a(i,e){let t=Ju[e];t===void 0&&(t=new Int32Array(e),Ju[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function m_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function g_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xt(t,e))return;i.uniform2fv(this.addr,e),bt(t,e)}}function y_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(xt(t,e))return;i.uniform3fv(this.addr,e),bt(t,e)}}function __(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xt(t,e))return;i.uniform4fv(this.addr,e),bt(t,e)}}function v_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(xt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),bt(t,e)}else{if(xt(t,n))return;td.set(n),i.uniformMatrix2fv(this.addr,!1,td),bt(t,n)}}function x_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(xt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),bt(t,e)}else{if(xt(t,n))return;ed.set(n),i.uniformMatrix3fv(this.addr,!1,ed),bt(t,n)}}function b_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(xt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),bt(t,e)}else{if(xt(t,n))return;Qu.set(n),i.uniformMatrix4fv(this.addr,!1,Qu),bt(t,n)}}function M_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function w_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xt(t,e))return;i.uniform2iv(this.addr,e),bt(t,e)}}function S_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xt(t,e))return;i.uniform3iv(this.addr,e),bt(t,e)}}function E_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xt(t,e))return;i.uniform4iv(this.addr,e),bt(t,e)}}function A_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function T_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(xt(t,e))return;i.uniform2uiv(this.addr,e),bt(t,e)}}function R_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(xt(t,e))return;i.uniform3uiv(this.addr,e),bt(t,e)}}function C_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(xt(t,e))return;i.uniform4uiv(this.addr,e),bt(t,e)}}function I_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Ku.compareFunction=Xd,r=Ku):r=Kd,t.setTexture2D(e||r,s)}function P_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Jd,s)}function L_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||Qd,s)}function N_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Zd,s)}function D_(i){switch(i){case 5126:return m_;case 35664:return g_;case 35665:return y_;case 35666:return __;case 35674:return v_;case 35675:return x_;case 35676:return b_;case 5124:case 35670:return M_;case 35667:case 35671:return w_;case 35668:case 35672:return S_;case 35669:case 35673:return E_;case 5125:return A_;case 36294:return T_;case 36295:return R_;case 36296:return C_;case 35678:case 36198:case 36298:case 36306:case 35682:return I_;case 35679:case 36299:case 36307:return P_;case 35680:case 36300:case 36308:case 36293:return L_;case 36289:case 36303:case 36311:case 36292:return N_}}function U_(i,e){i.uniform1fv(this.addr,e)}function k_(i,e){let t=Ts(e,this.size,2);i.uniform2fv(this.addr,t)}function O_(i,e){let t=Ts(e,this.size,3);i.uniform3fv(this.addr,t)}function F_(i,e){let t=Ts(e,this.size,4);i.uniform4fv(this.addr,t)}function B_(i,e){let t=Ts(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function z_(i,e){let t=Ts(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function H_(i,e){let t=Ts(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function V_(i,e){i.uniform1iv(this.addr,e)}function G_(i,e){i.uniform2iv(this.addr,e)}function W_(i,e){i.uniform3iv(this.addr,e)}function X_(i,e){i.uniform4iv(this.addr,e)}function q_(i,e){i.uniform1uiv(this.addr,e)}function Y_(i,e){i.uniform2uiv(this.addr,e)}function $_(i,e){i.uniform3uiv(this.addr,e)}function j_(i,e){i.uniform4uiv(this.addr,e)}function K_(i,e,t){let n=this.cache,s=e.length,r=$a(t,s);xt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTexture2D(e[a]||Kd,r[a])}function Z_(i,e,t){let n=this.cache,s=e.length,r=$a(t,s);xt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||Jd,r[a])}function J_(i,e,t){let n=this.cache,s=e.length,r=$a(t,s);xt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||Qd,r[a])}function Q_(i,e,t){let n=this.cache,s=e.length,r=$a(t,s);xt(n,r)||(i.uniform1iv(this.addr,r),bt(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||Zd,r[a])}function ev(i){switch(i){case 5126:return U_;case 35664:return k_;case 35665:return O_;case 35666:return F_;case 35674:return B_;case 35675:return z_;case 35676:return H_;case 5124:case 35670:return V_;case 35667:case 35671:return G_;case 35668:case 35672:return W_;case 35669:case 35673:return X_;case 5125:return q_;case 36294:return Y_;case 36295:return $_;case 36296:return j_;case 35678:case 36198:case 36298:case 36306:case 35682:return K_;case 35679:case 36299:case 36307:return Z_;case 35680:case 36300:case 36308:case 36293:return J_;case 36289:case 36303:case 36311:case 36292:return Q_}}function nd(i,e){i.seq.push(e),i.map[e.id]=e}function tv(i,e,t){let n=i.name,s=n.length;for(uc.lastIndex=0;;){let r=uc.exec(n),a=uc.lastIndex,o=r[1],c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===s){nd(t,l===void 0?new al(o,i,e):new ol(o,i,e));break}else{let u=t.map[o];u===void 0&&(u=new cl(o),nd(t,u)),t=u}}}function id(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}function sv(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}function rv(i){let e=qe.getPrimaries(qe.workingColorSpace),t=qe.getPrimaries(i),n;switch(e===t?n="":e===ha&&t===la?n="LinearDisplayP3ToLinearSRGB":e===la&&t===ha&&(n="LinearSRGBToLinearDisplayP3"),i){case Et:case Ya:return[n,"LinearTransferOETF"];case Ut:case Bl:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",i),[n,"LinearTransferOETF"]}}function sd(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),s=i.getShaderInfoLog(e).trim();if(n&&s==="")return"";let r=/ERROR: 0:(\d+)/.exec(s);if(r){let a=parseInt(r[1]);return t.toUpperCase()+`

`+s+`

`+sv(i.getShaderSource(e),a)}else return s}function av(i,e){let t=rv(e);return`vec4 ${i}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function ov(i,e){let t;switch(e){case dm:t="Linear";break;case fm:t="Reinhard";break;case pm:t="Cineon";break;case mm:t="ACESFilmic";break;case ym:t="AgX";break;case _m:t="Neutral";break;case gm:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function cv(){qe.getLuminanceCoefficients(Yr);let i=Yr.x.toFixed(4),e=Yr.y.toFixed(4),t=Yr.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function lv(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter($s).join(`
`)}function hv(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function uv(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function $s(i){return i!==""}function rd(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ad(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}function ll(i){return i.replace(dv,pv)}function pv(i,e){let t=Fe[e];if(t===void 0){let n=fv.get(e);if(n!==void 0)t=Fe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return ll(t)}function od(i){return i.replace(mv,gv)}function gv(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function cd(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function yv(i){let e="SHADOWMAP_TYPE_BASIC";return i.shadowMapType===Pd?e="SHADOWMAP_TYPE_PCF":i.shadowMapType===Xp?e="SHADOWMAP_TYPE_PCF_SOFT":i.shadowMapType===Fn&&(e="SHADOWMAP_TYPE_VSM"),e}function _v(i){let e="ENVMAP_TYPE_CUBE";if(i.envMap)switch(i.envMapMode){case ps:case ms:e="ENVMAP_TYPE_CUBE";break;case Xa:e="ENVMAP_TYPE_CUBE_UV";break}return e}function vv(i){let e="ENVMAP_MODE_REFLECTION";return i.envMap&&i.envMapMode===ms&&(e="ENVMAP_MODE_REFRACTION"),e}function xv(i){let e="ENVMAP_BLENDING_NONE";if(i.envMap)switch(i.combine){case Ld:e="ENVMAP_BLENDING_MULTIPLY";break;case hm:e="ENVMAP_BLENDING_MIX";break;case um:e="ENVMAP_BLENDING_ADD";break}return e}function bv(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:n,maxMip:t}}function Mv(i,e,t,n){let s=i.getContext(),r=t.defines,a=t.vertexShader,o=t.fragmentShader,c=yv(t),l=_v(t),h=vv(t),u=xv(t),d=bv(t),f=lv(t),g=hv(r),y=s.createProgram(),p,m,_=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter($s).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter($s).join(`
`),m.length>0&&(m+=`
`)):(p=[cd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter($s).join(`
`),m=[cd(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==ai?"#define TONE_MAPPING":"",t.toneMapping!==ai?Fe.tonemapping_pars_fragment:"",t.toneMapping!==ai?ov("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Fe.colorspace_pars_fragment,av("linearToOutputTexel",t.outputColorSpace),cv(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter($s).join(`
`)),a=ll(a),a=rd(a,t),a=ad(a,t),o=ll(o),o=rd(o,t),o=ad(o,t),a=od(a),o=od(o),t.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,p=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",t.glslVersion===Eu?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Eu?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);let x=_+p+a,b=_+m+o,C=id(s,s.VERTEX_SHADER,x),A=id(s,s.FRAGMENT_SHADER,b);s.attachShader(y,C),s.attachShader(y,A),t.index0AttributeName!==void 0?s.bindAttribLocation(y,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function E(M){if(i.debug.checkShaderErrors){let L=s.getProgramInfoLog(y).trim(),U=s.getShaderInfoLog(C).trim(),I=s.getShaderInfoLog(A).trim(),R=!0,P=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(R=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,y,C,A);else{let $=sd(s,C,"vertex"),V=sd(s,A,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+M.name+`
Material Type: `+M.type+`

Program Info Log: `+L+`
`+$+`
`+V)}else L!==""?console.warn("THREE.WebGLProgram: Program Info Log:",L):(U===""||I==="")&&(P=!1);P&&(M.diagnostics={runnable:R,programLog:L,vertexShader:{log:U,prefix:p},fragmentShader:{log:I,prefix:m}})}s.deleteShader(C),s.deleteShader(A),N=new ds(s,y),j=uv(s,y)}let N;this.getUniforms=function(){return N===void 0&&E(this),N};let j;this.getAttributes=function(){return j===void 0&&E(this),j};let v=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return v===!1&&(v=s.getProgramParameter(y,nv)),v},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=iv++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=C,this.fragmentShader=A,this}function Sv(i,e,t,n,s,r,a){let o=new pa,c=new hl,l=new Set,h=[],u=s.logarithmicDepthBuffer,d=s.reverseDepthBuffer,f=s.vertexTextures,g=s.precision,y={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function p(v){return l.add(v),v===0?"uv":`uv${v}`}function m(v,M,L,U,I){let R=U.fog,P=I.geometry,$=v.isMeshStandardMaterial?U.environment:null,V=(v.isMeshStandardMaterial?t:e).get(v.envMap||$),k=V&&V.mapping===Xa?V.image.height:null,Y=y[v.type];v.precision!==null&&(g=s.getMaxPrecision(v.precision),g!==v.precision&&console.warn("THREE.WebGLProgram.getParameters:",v.precision,"not supported, using",g,"instead."));let se=P.morphAttributes.position||P.morphAttributes.normal||P.morphAttributes.color,Se=se!==void 0?se.length:0,Ve=0;P.morphAttributes.position!==void 0&&(Ve=1),P.morphAttributes.normal!==void 0&&(Ve=2),P.morphAttributes.color!==void 0&&(Ve=3);let Z,ie,B,G;if(Y){let Wt=wn[Y];Z=Wt.vertexShader,ie=Wt.fragmentShader}else Z=v.vertexShader,ie=v.fragmentShader,c.update(v),B=c.getVertexShaderID(v),G=c.getFragmentShaderID(v);let ce=i.getRenderTarget(),ge=I.isInstancedMesh===!0,Ue=I.isBatchedMesh===!0,Ze=!!v.map,ze=!!v.matcap,D=!!V,Jt=!!v.aoMap,Ge=!!v.lightMap,Ye=!!v.bumpMap,Pe=!!v.normalMap,at=!!v.displacementMap,De=!!v.emissiveMap,T=!!v.metalnessMap,w=!!v.roughnessMap,W=v.anisotropy>0,Q=v.clearcoat>0,ne=v.dispersion>0,J=v.iridescence>0,Me=v.sheen>0,ue=v.transmission>0,ye=W&&!!v.anisotropyMap,$e=Q&&!!v.clearcoatMap,re=Q&&!!v.clearcoatNormalMap,_e=Q&&!!v.clearcoatRoughnessMap,Le=J&&!!v.iridescenceMap,Ne=J&&!!v.iridescenceThicknessMap,ve=Me&&!!v.sheenColorMap,We=Me&&!!v.sheenRoughnessMap,ke=!!v.specularMap,rt=!!v.specularColorMap,F=!!v.specularIntensityMap,pe=ue&&!!v.transmissionMap,K=ue&&!!v.thicknessMap,ee=!!v.gradientMap,de=!!v.alphaMap,me=v.alphaTest>0,Xe=!!v.alphaHash,pt=!!v.extensions,Gt=ai;v.toneMapped&&(ce===null||ce.isXRRenderTarget===!0)&&(Gt=i.toneMapping);let je={shaderID:Y,shaderType:v.type,shaderName:v.name,vertexShader:Z,fragmentShader:ie,defines:v.defines,customVertexShaderID:B,customFragmentShaderID:G,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:g,batching:Ue,batchingColor:Ue&&I._colorsTexture!==null,instancing:ge,instancingColor:ge&&I.instanceColor!==null,instancingMorph:ge&&I.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:ce===null?i.outputColorSpace:ce.isXRRenderTarget===!0?ce.texture.colorSpace:Et,alphaToCoverage:!!v.alphaToCoverage,map:Ze,matcap:ze,envMap:D,envMapMode:D&&V.mapping,envMapCubeUVHeight:k,aoMap:Jt,lightMap:Ge,bumpMap:Ye,normalMap:Pe,displacementMap:f&&at,emissiveMap:De,normalMapObjectSpace:Pe&&v.normalMapType===Am,normalMapTangentSpace:Pe&&v.normalMapType===Wd,metalnessMap:T,roughnessMap:w,anisotropy:W,anisotropyMap:ye,clearcoat:Q,clearcoatMap:$e,clearcoatNormalMap:re,clearcoatRoughnessMap:_e,dispersion:ne,iridescence:J,iridescenceMap:Le,iridescenceThicknessMap:Ne,sheen:Me,sheenColorMap:ve,sheenRoughnessMap:We,specularMap:ke,specularColorMap:rt,specularIntensityMap:F,transmission:ue,transmissionMap:pe,thicknessMap:K,gradientMap:ee,opaque:v.transparent===!1&&v.blending===ls&&v.alphaToCoverage===!1,alphaMap:de,alphaTest:me,alphaHash:Xe,combine:v.combine,mapUv:Ze&&p(v.map.channel),aoMapUv:Jt&&p(v.aoMap.channel),lightMapUv:Ge&&p(v.lightMap.channel),bumpMapUv:Ye&&p(v.bumpMap.channel),normalMapUv:Pe&&p(v.normalMap.channel),displacementMapUv:at&&p(v.displacementMap.channel),emissiveMapUv:De&&p(v.emissiveMap.channel),metalnessMapUv:T&&p(v.metalnessMap.channel),roughnessMapUv:w&&p(v.roughnessMap.channel),anisotropyMapUv:ye&&p(v.anisotropyMap.channel),clearcoatMapUv:$e&&p(v.clearcoatMap.channel),clearcoatNormalMapUv:re&&p(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:_e&&p(v.clearcoatRoughnessMap.channel),iridescenceMapUv:Le&&p(v.iridescenceMap.channel),iridescenceThicknessMapUv:Ne&&p(v.iridescenceThicknessMap.channel),sheenColorMapUv:ve&&p(v.sheenColorMap.channel),sheenRoughnessMapUv:We&&p(v.sheenRoughnessMap.channel),specularMapUv:ke&&p(v.specularMap.channel),specularColorMapUv:rt&&p(v.specularColorMap.channel),specularIntensityMapUv:F&&p(v.specularIntensityMap.channel),transmissionMapUv:pe&&p(v.transmissionMap.channel),thicknessMapUv:K&&p(v.thicknessMap.channel),alphaMapUv:de&&p(v.alphaMap.channel),vertexTangents:!!P.attributes.tangent&&(Pe||W),vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!P.attributes.color&&P.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!P.attributes.uv&&(Ze||de),fog:!!R,useFog:v.fog===!0,fogExp2:!!R&&R.isFogExp2,flatShading:v.flatShading===!0,sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:u,reverseDepthBuffer:d,skinning:I.isSkinnedMesh===!0,morphTargets:P.morphAttributes.position!==void 0,morphNormals:P.morphAttributes.normal!==void 0,morphColors:P.morphAttributes.color!==void 0,morphTargetsCount:Se,morphTextureStride:Ve,numDirLights:M.directional.length,numPointLights:M.point.length,numSpotLights:M.spot.length,numSpotLightMaps:M.spotLightMap.length,numRectAreaLights:M.rectArea.length,numHemiLights:M.hemi.length,numDirLightShadows:M.directionalShadowMap.length,numPointLightShadows:M.pointShadowMap.length,numSpotLightShadows:M.spotShadowMap.length,numSpotLightShadowsWithMaps:M.numSpotLightShadowsWithMaps,numLightProbes:M.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&L.length>0,shadowMapType:i.shadowMap.type,toneMapping:Gt,decodeVideoTexture:Ze&&v.map.isVideoTexture===!0&&qe.getTransfer(v.map.colorSpace)===ct,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===sn,flipSided:v.side===qt,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:pt&&v.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(pt&&v.extensions.multiDraw===!0||Ue)&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return je.vertexUv1s=l.has(1),je.vertexUv2s=l.has(2),je.vertexUv3s=l.has(3),l.clear(),je}function _(v){let M=[];if(v.shaderID?M.push(v.shaderID):(M.push(v.customVertexShaderID),M.push(v.customFragmentShaderID)),v.defines!==void 0)for(let L in v.defines)M.push(L),M.push(v.defines[L]);return v.isRawShaderMaterial===!1&&(x(M,v),b(M,v),M.push(i.outputColorSpace)),M.push(v.customProgramCacheKey),M.join()}function x(v,M){v.push(M.precision),v.push(M.outputColorSpace),v.push(M.envMapMode),v.push(M.envMapCubeUVHeight),v.push(M.mapUv),v.push(M.alphaMapUv),v.push(M.lightMapUv),v.push(M.aoMapUv),v.push(M.bumpMapUv),v.push(M.normalMapUv),v.push(M.displacementMapUv),v.push(M.emissiveMapUv),v.push(M.metalnessMapUv),v.push(M.roughnessMapUv),v.push(M.anisotropyMapUv),v.push(M.clearcoatMapUv),v.push(M.clearcoatNormalMapUv),v.push(M.clearcoatRoughnessMapUv),v.push(M.iridescenceMapUv),v.push(M.iridescenceThicknessMapUv),v.push(M.sheenColorMapUv),v.push(M.sheenRoughnessMapUv),v.push(M.specularMapUv),v.push(M.specularColorMapUv),v.push(M.specularIntensityMapUv),v.push(M.transmissionMapUv),v.push(M.thicknessMapUv),v.push(M.combine),v.push(M.fogExp2),v.push(M.sizeAttenuation),v.push(M.morphTargetsCount),v.push(M.morphAttributeCount),v.push(M.numDirLights),v.push(M.numPointLights),v.push(M.numSpotLights),v.push(M.numSpotLightMaps),v.push(M.numHemiLights),v.push(M.numRectAreaLights),v.push(M.numDirLightShadows),v.push(M.numPointLightShadows),v.push(M.numSpotLightShadows),v.push(M.numSpotLightShadowsWithMaps),v.push(M.numLightProbes),v.push(M.shadowMapType),v.push(M.toneMapping),v.push(M.numClippingPlanes),v.push(M.numClipIntersection),v.push(M.depthPacking)}function b(v,M){o.disableAll(),M.supportsVertexTextures&&o.enable(0),M.instancing&&o.enable(1),M.instancingColor&&o.enable(2),M.instancingMorph&&o.enable(3),M.matcap&&o.enable(4),M.envMap&&o.enable(5),M.normalMapObjectSpace&&o.enable(6),M.normalMapTangentSpace&&o.enable(7),M.clearcoat&&o.enable(8),M.iridescence&&o.enable(9),M.alphaTest&&o.enable(10),M.vertexColors&&o.enable(11),M.vertexAlphas&&o.enable(12),M.vertexUv1s&&o.enable(13),M.vertexUv2s&&o.enable(14),M.vertexUv3s&&o.enable(15),M.vertexTangents&&o.enable(16),M.anisotropy&&o.enable(17),M.alphaHash&&o.enable(18),M.batching&&o.enable(19),M.dispersion&&o.enable(20),M.batchingColor&&o.enable(21),v.push(o.mask),o.disableAll(),M.fog&&o.enable(0),M.useFog&&o.enable(1),M.flatShading&&o.enable(2),M.logarithmicDepthBuffer&&o.enable(3),M.reverseDepthBuffer&&o.enable(4),M.skinning&&o.enable(5),M.morphTargets&&o.enable(6),M.morphNormals&&o.enable(7),M.morphColors&&o.enable(8),M.premultipliedAlpha&&o.enable(9),M.shadowMapEnabled&&o.enable(10),M.doubleSided&&o.enable(11),M.flipSided&&o.enable(12),M.useDepthPacking&&o.enable(13),M.dithering&&o.enable(14),M.transmission&&o.enable(15),M.sheen&&o.enable(16),M.opaque&&o.enable(17),M.pointsUvs&&o.enable(18),M.decodeVideoTexture&&o.enable(19),M.alphaToCoverage&&o.enable(20),v.push(o.mask)}function C(v){let M=y[v.type],L;if(M){let U=wn[M];L=pg.clone(U.uniforms)}else L=v.uniforms;return L}function A(v,M){let L;for(let U=0,I=h.length;U<I;U++){let R=h[U];if(R.cacheKey===M){L=R,++L.usedTimes;break}}return L===void 0&&(L=new Mv(i,M,v,r),h.push(L)),L}function E(v){if(--v.usedTimes===0){let M=h.indexOf(v);h[M]=h[h.length-1],h.pop(),v.destroy()}}function N(v){c.remove(v)}function j(){c.dispose()}return{getParameters:m,getProgramCacheKey:_,getUniforms:C,acquireProgram:A,releaseProgram:E,releaseShaderCache:N,programs:h,dispose:j}}function Ev(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,c){i.get(a)[o]=c}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function Av(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.z!==e.z?i.z-e.z:i.id-e.id}function ld(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function hd(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(u,d,f,g,y,p){let m=i[e];return m===void 0?(m={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:y,group:p},i[e]=m):(m.id=u.id,m.object=u,m.geometry=d,m.material=f,m.groupOrder=g,m.renderOrder=u.renderOrder,m.z=y,m.group=p),e++,m}function o(u,d,f,g,y,p){let m=a(u,d,f,g,y,p);f.transmission>0?n.push(m):f.transparent===!0?s.push(m):t.push(m)}function c(u,d,f,g,y,p){let m=a(u,d,f,g,y,p);f.transmission>0?n.unshift(m):f.transparent===!0?s.unshift(m):t.unshift(m)}function l(u,d){t.length>1&&t.sort(u||Av),n.length>1&&n.sort(d||ld),s.length>1&&s.sort(d||ld)}function h(){for(let u=e,d=i.length;u<d;u++){let f=i[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:o,unshift:c,finish:h,sort:l}}function Tv(){let i=new WeakMap;function e(n,s){let r=i.get(n),a;return r===void 0?(a=new hd,i.set(n,[a])):s>=r.length?(a=new hd,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function Rv(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new O,color:new Ie};break;case"SpotLight":t={position:new O,direction:new O,color:new Ie,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new O,color:new Ie,distance:0,decay:0};break;case"HemisphereLight":t={direction:new O,skyColor:new Ie,groundColor:new Ie};break;case"RectAreaLight":t={color:new Ie,position:new O,halfWidth:new O,halfHeight:new O};break}return i[e.id]=t,t}}}function Cv(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Te};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Te};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Te,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}function Pv(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Lv(i){let e=new Rv,t=Cv(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new O);let s=new O,r=new Oe,a=new Oe;function o(l){let h=0,u=0,d=0;for(let j=0;j<9;j++)n.probe[j].set(0,0,0);let f=0,g=0,y=0,p=0,m=0,_=0,x=0,b=0,C=0,A=0,E=0;l.sort(Pv);for(let j=0,v=l.length;j<v;j++){let M=l[j],L=M.color,U=M.intensity,I=M.distance,R=M.shadow&&M.shadow.map?M.shadow.map.texture:null;if(M.isAmbientLight)h+=L.r*U,u+=L.g*U,d+=L.b*U;else if(M.isLightProbe){for(let P=0;P<9;P++)n.probe[P].addScaledVector(M.sh.coefficients[P],U);E++}else if(M.isDirectionalLight){let P=e.get(M);if(P.color.copy(M.color).multiplyScalar(M.intensity),M.castShadow){let $=M.shadow,V=t.get(M);V.shadowIntensity=$.intensity,V.shadowBias=$.bias,V.shadowNormalBias=$.normalBias,V.shadowRadius=$.radius,V.shadowMapSize=$.mapSize,n.directionalShadow[f]=V,n.directionalShadowMap[f]=R,n.directionalShadowMatrix[f]=M.shadow.matrix,_++}n.directional[f]=P,f++}else if(M.isSpotLight){let P=e.get(M);P.position.setFromMatrixPosition(M.matrixWorld),P.color.copy(L).multiplyScalar(U),P.distance=I,P.coneCos=Math.cos(M.angle),P.penumbraCos=Math.cos(M.angle*(1-M.penumbra)),P.decay=M.decay,n.spot[y]=P;let $=M.shadow;if(M.map&&(n.spotLightMap[C]=M.map,C++,$.updateMatrices(M),M.castShadow&&A++),n.spotLightMatrix[y]=$.matrix,M.castShadow){let V=t.get(M);V.shadowIntensity=$.intensity,V.shadowBias=$.bias,V.shadowNormalBias=$.normalBias,V.shadowRadius=$.radius,V.shadowMapSize=$.mapSize,n.spotShadow[y]=V,n.spotShadowMap[y]=R,b++}y++}else if(M.isRectAreaLight){let P=e.get(M);P.color.copy(L).multiplyScalar(U),P.halfWidth.set(M.width*.5,0,0),P.halfHeight.set(0,M.height*.5,0),n.rectArea[p]=P,p++}else if(M.isPointLight){let P=e.get(M);if(P.color.copy(M.color).multiplyScalar(M.intensity),P.distance=M.distance,P.decay=M.decay,M.castShadow){let $=M.shadow,V=t.get(M);V.shadowIntensity=$.intensity,V.shadowBias=$.bias,V.shadowNormalBias=$.normalBias,V.shadowRadius=$.radius,V.shadowMapSize=$.mapSize,V.shadowCameraNear=$.camera.near,V.shadowCameraFar=$.camera.far,n.pointShadow[g]=V,n.pointShadowMap[g]=R,n.pointShadowMatrix[g]=M.shadow.matrix,x++}n.point[g]=P,g++}else if(M.isHemisphereLight){let P=e.get(M);P.skyColor.copy(M.color).multiplyScalar(U),P.groundColor.copy(M.groundColor).multiplyScalar(U),n.hemi[m]=P,m++}}p>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=le.LTC_FLOAT_1,n.rectAreaLTC2=le.LTC_FLOAT_2):(n.rectAreaLTC1=le.LTC_HALF_1,n.rectAreaLTC2=le.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=u,n.ambient[2]=d;let N=n.hash;(N.directionalLength!==f||N.pointLength!==g||N.spotLength!==y||N.rectAreaLength!==p||N.hemiLength!==m||N.numDirectionalShadows!==_||N.numPointShadows!==x||N.numSpotShadows!==b||N.numSpotMaps!==C||N.numLightProbes!==E)&&(n.directional.length=f,n.spot.length=y,n.rectArea.length=p,n.point.length=g,n.hemi.length=m,n.directionalShadow.length=_,n.directionalShadowMap.length=_,n.pointShadow.length=x,n.pointShadowMap.length=x,n.spotShadow.length=b,n.spotShadowMap.length=b,n.directionalShadowMatrix.length=_,n.pointShadowMatrix.length=x,n.spotLightMatrix.length=b+C-A,n.spotLightMap.length=C,n.numSpotLightShadowsWithMaps=A,n.numLightProbes=E,N.directionalLength=f,N.pointLength=g,N.spotLength=y,N.rectAreaLength=p,N.hemiLength=m,N.numDirectionalShadows=_,N.numPointShadows=x,N.numSpotShadows=b,N.numSpotMaps=C,N.numLightProbes=E,n.version=Iv++)}function c(l,h){let u=0,d=0,f=0,g=0,y=0,p=h.matrixWorldInverse;for(let m=0,_=l.length;m<_;m++){let x=l[m];if(x.isDirectionalLight){let b=n.directional[u];b.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(p),u++}else if(x.isSpotLight){let b=n.spot[f];b.position.setFromMatrixPosition(x.matrixWorld),b.position.applyMatrix4(p),b.direction.setFromMatrixPosition(x.matrixWorld),s.setFromMatrixPosition(x.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(p),f++}else if(x.isRectAreaLight){let b=n.rectArea[g];b.position.setFromMatrixPosition(x.matrixWorld),b.position.applyMatrix4(p),a.identity(),r.copy(x.matrixWorld),r.premultiply(p),a.extractRotation(r),b.halfWidth.set(x.width*.5,0,0),b.halfHeight.set(0,x.height*.5,0),b.halfWidth.applyMatrix4(a),b.halfHeight.applyMatrix4(a),g++}else if(x.isPointLight){let b=n.point[d];b.position.setFromMatrixPosition(x.matrixWorld),b.position.applyMatrix4(p),d++}else if(x.isHemisphereLight){let b=n.hemi[y];b.direction.setFromMatrixPosition(x.matrixWorld),b.direction.transformDirection(p),y++}}}return{setup:o,setupView:c,state:n}}function ud(i){let e=new Lv(i),t=[],n=[];function s(h){l.camera=h,t.length=0,n.length=0}function r(h){t.push(h)}function a(h){n.push(h)}function o(){e.setup(t)}function c(h){e.setupView(t,h)}let l={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:l,setupLights:o,setupLightsView:c,pushLight:r,pushShadow:a}}function Nv(i){let e=new WeakMap;function t(s,r=0){let a=e.get(s),o;return a===void 0?(o=new ud(i),e.set(s,[o])):r>=a.length?(o=new ud(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}function kv(i,e,t){let n=new ir,s=new Te,r=new Te,a=new Ke,o=new dl({depthPacking:Em}),c=new fl,l={},h=t.maxTextureSize,u={[En]:qt,[qt]:En,[sn]:sn},d=new Rn({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Te},radius:{value:4}},vertexShader:Dv,fragmentShader:Uv}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let g=new zt;g.setAttribute("position",new vt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new gt(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Pd;let m=this.type;this.render=function(A,E,N){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||A.length===0)return;let j=i.getRenderTarget(),v=i.getActiveCubeFace(),M=i.getActiveMipmapLevel(),L=i.state;L.setBlending(ri),L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);let U=m!==Fn&&this.type===Fn,I=m===Fn&&this.type!==Fn;for(let R=0,P=A.length;R<P;R++){let $=A[R],V=$.shadow;if(V===void 0){console.warn("THREE.WebGLShadowMap:",$,"has no shadow.");continue}if(V.autoUpdate===!1&&V.needsUpdate===!1)continue;s.copy(V.mapSize);let k=V.getFrameExtents();if(s.multiply(k),r.copy(V.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/k.x),s.x=r.x*k.x,V.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/k.y),s.y=r.y*k.y,V.mapSize.y=r.y)),V.map===null||U===!0||I===!0){let se=this.type!==Fn?{minFilter:kt,magFilter:kt}:{};V.map!==null&&V.map.dispose(),V.map=new Vn(s.x,s.y,se),V.map.texture.name=$.name+".shadowMap",V.camera.updateProjectionMatrix()}i.setRenderTarget(V.map),i.clear();let Y=V.getViewportCount();for(let se=0;se<Y;se++){let Se=V.getViewport(se);a.set(r.x*Se.x,r.y*Se.y,r.x*Se.z,r.y*Se.w),L.viewport(a),V.updateMatrices($,se),n=V.getFrustum(),b(E,N,V.camera,$,this.type)}V.isPointLightShadow!==!0&&this.type===Fn&&_(V,N),V.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(j,v,M)};function _(A,E){let N=e.update(y);d.defines.VSM_SAMPLES!==A.blurSamples&&(d.defines.VSM_SAMPLES=A.blurSamples,f.defines.VSM_SAMPLES=A.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),A.mapPass===null&&(A.mapPass=new Vn(s.x,s.y)),d.uniforms.shadow_pass.value=A.map.texture,d.uniforms.resolution.value=A.mapSize,d.uniforms.radius.value=A.radius,i.setRenderTarget(A.mapPass),i.clear(),i.renderBufferDirect(E,null,N,d,y,null),f.uniforms.shadow_pass.value=A.mapPass.texture,f.uniforms.resolution.value=A.mapSize,f.uniforms.radius.value=A.radius,i.setRenderTarget(A.map),i.clear(),i.renderBufferDirect(E,null,N,f,y,null)}function x(A,E,N,j){let v=null,M=N.isPointLight===!0?A.customDistanceMaterial:A.customDepthMaterial;if(M!==void 0)v=M;else if(v=N.isPointLight===!0?c:o,i.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0){let L=v.uuid,U=E.uuid,I=l[L];I===void 0&&(I={},l[L]=I);let R=I[U];R===void 0&&(R=v.clone(),I[U]=R,E.addEventListener("dispose",C)),v=R}if(v.visible=E.visible,v.wireframe=E.wireframe,j===Fn?v.side=E.shadowSide!==null?E.shadowSide:E.side:v.side=E.shadowSide!==null?E.shadowSide:u[E.side],v.alphaMap=E.alphaMap,v.alphaTest=E.alphaTest,v.map=E.map,v.clipShadows=E.clipShadows,v.clippingPlanes=E.clippingPlanes,v.clipIntersection=E.clipIntersection,v.displacementMap=E.displacementMap,v.displacementScale=E.displacementScale,v.displacementBias=E.displacementBias,v.wireframeLinewidth=E.wireframeLinewidth,v.linewidth=E.linewidth,N.isPointLight===!0&&v.isMeshDistanceMaterial===!0){let L=i.properties.get(v);L.light=N}return v}function b(A,E,N,j,v){if(A.visible===!1)return;if(A.layers.test(E.layers)&&(A.isMesh||A.isLine||A.isPoints)&&(A.castShadow||A.receiveShadow&&v===Fn)&&(!A.frustumCulled||n.intersectsObject(A))){A.modelViewMatrix.multiplyMatrices(N.matrixWorldInverse,A.matrixWorld);let U=e.update(A),I=A.material;if(Array.isArray(I)){let R=U.groups;for(let P=0,$=R.length;P<$;P++){let V=R[P],k=I[V.materialIndex];if(k&&k.visible){let Y=x(A,k,j,v);A.onBeforeShadow(i,A,E,N,U,Y,V),i.renderBufferDirect(N,null,U,Y,A,V),A.onAfterShadow(i,A,E,N,U,Y,V)}}}else if(I.visible){let R=x(A,I,j,v);A.onBeforeShadow(i,A,E,N,U,R,null),i.renderBufferDirect(N,null,U,R,A,null),A.onAfterShadow(i,A,E,N,U,R,null)}}let L=A.children;for(let U=0,I=L.length;U<I;U++)b(L[U],E,N,j,v)}function C(A){A.target.removeEventListener("dispose",C);for(let N in l){let j=l[N],v=A.target.uuid;v in j&&(j[v].dispose(),delete j[v])}}}function Fv(i){function e(){let F=!1,pe=new Ke,K=null,ee=new Ke(0,0,0,0);return{setMask:function(de){K!==de&&!F&&(i.colorMask(de,de,de,de),K=de)},setLocked:function(de){F=de},setClear:function(de,me,Xe,pt,Gt){Gt===!0&&(de*=pt,me*=pt,Xe*=pt),pe.set(de,me,Xe,pt),ee.equals(pe)===!1&&(i.clearColor(de,me,Xe,pt),ee.copy(pe))},reset:function(){F=!1,K=null,ee.set(-1,0,0,0)}}}function t(){let F=!1,pe=!1,K=null,ee=null,de=null;return{setReversed:function(me){pe=me},setTest:function(me){me?B(i.DEPTH_TEST):G(i.DEPTH_TEST)},setMask:function(me){K!==me&&!F&&(i.depthMask(me),K=me)},setFunc:function(me){if(pe&&(me=Ov[me]),ee!==me){switch(me){case vc:i.depthFunc(i.NEVER);break;case xc:i.depthFunc(i.ALWAYS);break;case bc:i.depthFunc(i.LESS);break;case fs:i.depthFunc(i.LEQUAL);break;case Mc:i.depthFunc(i.EQUAL);break;case wc:i.depthFunc(i.GEQUAL);break;case Sc:i.depthFunc(i.GREATER);break;case Ec:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ee=me}},setLocked:function(me){F=me},setClear:function(me){de!==me&&(i.clearDepth(me),de=me)},reset:function(){F=!1,K=null,ee=null,de=null}}}function n(){let F=!1,pe=null,K=null,ee=null,de=null,me=null,Xe=null,pt=null,Gt=null;return{setTest:function(je){F||(je?B(i.STENCIL_TEST):G(i.STENCIL_TEST))},setMask:function(je){pe!==je&&!F&&(i.stencilMask(je),pe=je)},setFunc:function(je,Wt,Pn){(K!==je||ee!==Wt||de!==Pn)&&(i.stencilFunc(je,Wt,Pn),K=je,ee=Wt,de=Pn)},setOp:function(je,Wt,Pn){(me!==je||Xe!==Wt||pt!==Pn)&&(i.stencilOp(je,Wt,Pn),me=je,Xe=Wt,pt=Pn)},setLocked:function(je){F=je},setClear:function(je){Gt!==je&&(i.clearStencil(je),Gt=je)},reset:function(){F=!1,pe=null,K=null,ee=null,de=null,me=null,Xe=null,pt=null,Gt=null}}}let s=new e,r=new t,a=new n,o=new WeakMap,c=new WeakMap,l={},h={},u=new WeakMap,d=[],f=null,g=!1,y=null,p=null,m=null,_=null,x=null,b=null,C=null,A=new Ie(0,0,0),E=0,N=!1,j=null,v=null,M=null,L=null,U=null,I=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),R=!1,P=0,$=i.getParameter(i.VERSION);$.indexOf("WebGL")!==-1?(P=parseFloat(/^WebGL (\d)/.exec($)[1]),R=P>=1):$.indexOf("OpenGL ES")!==-1&&(P=parseFloat(/^OpenGL ES (\d)/.exec($)[1]),R=P>=2);let V=null,k={},Y=i.getParameter(i.SCISSOR_BOX),se=i.getParameter(i.VIEWPORT),Se=new Ke().fromArray(Y),Ve=new Ke().fromArray(se);function Z(F,pe,K,ee){let de=new Uint8Array(4),me=i.createTexture();i.bindTexture(F,me),i.texParameteri(F,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(F,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Xe=0;Xe<K;Xe++)F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY?i.texImage3D(pe,0,i.RGBA,1,1,ee,0,i.RGBA,i.UNSIGNED_BYTE,de):i.texImage2D(pe+Xe,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,de);return me}let ie={};ie[i.TEXTURE_2D]=Z(i.TEXTURE_2D,i.TEXTURE_2D,1),ie[i.TEXTURE_CUBE_MAP]=Z(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ie[i.TEXTURE_2D_ARRAY]=Z(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ie[i.TEXTURE_3D]=Z(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),r.setClear(1),a.setClear(0),B(i.DEPTH_TEST),r.setFunc(fs),Ge(!1),Ye(vu),B(i.CULL_FACE),D(ri);function B(F){l[F]!==!0&&(i.enable(F),l[F]=!0)}function G(F){l[F]!==!1&&(i.disable(F),l[F]=!1)}function ce(F,pe){return h[F]!==pe?(i.bindFramebuffer(F,pe),h[F]=pe,F===i.DRAW_FRAMEBUFFER&&(h[i.FRAMEBUFFER]=pe),F===i.FRAMEBUFFER&&(h[i.DRAW_FRAMEBUFFER]=pe),!0):!1}function ge(F,pe){let K=d,ee=!1;if(F){K=u.get(pe),K===void 0&&(K=[],u.set(pe,K));let de=F.textures;if(K.length!==de.length||K[0]!==i.COLOR_ATTACHMENT0){for(let me=0,Xe=de.length;me<Xe;me++)K[me]=i.COLOR_ATTACHMENT0+me;K.length=de.length,ee=!0}}else K[0]!==i.BACK&&(K[0]=i.BACK,ee=!0);ee&&i.drawBuffers(K)}function Ue(F){return f!==F?(i.useProgram(F),f=F,!0):!1}let Ze={[Ci]:i.FUNC_ADD,[Yp]:i.FUNC_SUBTRACT,[$p]:i.FUNC_REVERSE_SUBTRACT};Ze[jp]=i.MIN,Ze[Kp]=i.MAX;let ze={[Zp]:i.ZERO,[Jp]:i.ONE,[Qp]:i.SRC_COLOR,[yc]:i.SRC_ALPHA,[rm]:i.SRC_ALPHA_SATURATE,[im]:i.DST_COLOR,[tm]:i.DST_ALPHA,[em]:i.ONE_MINUS_SRC_COLOR,[_c]:i.ONE_MINUS_SRC_ALPHA,[sm]:i.ONE_MINUS_DST_COLOR,[nm]:i.ONE_MINUS_DST_ALPHA,[am]:i.CONSTANT_COLOR,[om]:i.ONE_MINUS_CONSTANT_COLOR,[cm]:i.CONSTANT_ALPHA,[lm]:i.ONE_MINUS_CONSTANT_ALPHA};function D(F,pe,K,ee,de,me,Xe,pt,Gt,je){if(F===ri){g===!0&&(G(i.BLEND),g=!1);return}if(g===!1&&(B(i.BLEND),g=!0),F!==qp){if(F!==y||je!==N){if((p!==Ci||x!==Ci)&&(i.blendEquation(i.FUNC_ADD),p=Ci,x=Ci),je)switch(F){case ls:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case xu:i.blendFunc(i.ONE,i.ONE);break;case bu:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Mu:i.blendFuncSeparate(i.ZERO,i.SRC_COLOR,i.ZERO,i.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}else switch(F){case ls:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case xu:i.blendFunc(i.SRC_ALPHA,i.ONE);break;case bu:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Mu:i.blendFunc(i.ZERO,i.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",F);break}m=null,_=null,b=null,C=null,A.set(0,0,0),E=0,y=F,N=je}return}de=de||pe,me=me||K,Xe=Xe||ee,(pe!==p||de!==x)&&(i.blendEquationSeparate(Ze[pe],Ze[de]),p=pe,x=de),(K!==m||ee!==_||me!==b||Xe!==C)&&(i.blendFuncSeparate(ze[K],ze[ee],ze[me],ze[Xe]),m=K,_=ee,b=me,C=Xe),(pt.equals(A)===!1||Gt!==E)&&(i.blendColor(pt.r,pt.g,pt.b,Gt),A.copy(pt),E=Gt),y=F,N=!1}function Jt(F,pe){F.side===sn?G(i.CULL_FACE):B(i.CULL_FACE);let K=F.side===qt;pe&&(K=!K),Ge(K),F.blending===ls&&F.transparent===!1?D(ri):D(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),r.setFunc(F.depthFunc),r.setTest(F.depthTest),r.setMask(F.depthWrite),s.setMask(F.colorWrite);let ee=F.stencilWrite;a.setTest(ee),ee&&(a.setMask(F.stencilWriteMask),a.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),a.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),at(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?B(i.SAMPLE_ALPHA_TO_COVERAGE):G(i.SAMPLE_ALPHA_TO_COVERAGE)}function Ge(F){j!==F&&(F?i.frontFace(i.CW):i.frontFace(i.CCW),j=F)}function Ye(F){F!==Gp?(B(i.CULL_FACE),F!==v&&(F===vu?i.cullFace(i.BACK):F===Wp?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):G(i.CULL_FACE),v=F}function Pe(F){F!==M&&(R&&i.lineWidth(F),M=F)}function at(F,pe,K){F?(B(i.POLYGON_OFFSET_FILL),(L!==pe||U!==K)&&(i.polygonOffset(pe,K),L=pe,U=K)):G(i.POLYGON_OFFSET_FILL)}function De(F){F?B(i.SCISSOR_TEST):G(i.SCISSOR_TEST)}function T(F){F===void 0&&(F=i.TEXTURE0+I-1),V!==F&&(i.activeTexture(F),V=F)}function w(F,pe,K){K===void 0&&(V===null?K=i.TEXTURE0+I-1:K=V);let ee=k[K];ee===void 0&&(ee={type:void 0,texture:void 0},k[K]=ee),(ee.type!==F||ee.texture!==pe)&&(V!==K&&(i.activeTexture(K),V=K),i.bindTexture(F,pe||ie[F]),ee.type=F,ee.texture=pe)}function W(){let F=k[V];F!==void 0&&F.type!==void 0&&(i.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function Q(){try{i.compressedTexImage2D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ne(){try{i.compressedTexImage3D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function J(){try{i.texSubImage2D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Me(){try{i.texSubImage3D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ue(){try{i.compressedTexSubImage2D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function ye(){try{i.compressedTexSubImage3D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function $e(){try{i.texStorage2D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function re(){try{i.texStorage3D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function _e(){try{i.texImage2D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Le(){try{i.texImage3D.apply(i,arguments)}catch(F){console.error("THREE.WebGLState:",F)}}function Ne(F){Se.equals(F)===!1&&(i.scissor(F.x,F.y,F.z,F.w),Se.copy(F))}function ve(F){Ve.equals(F)===!1&&(i.viewport(F.x,F.y,F.z,F.w),Ve.copy(F))}function We(F,pe){let K=c.get(pe);K===void 0&&(K=new WeakMap,c.set(pe,K));let ee=K.get(F);ee===void 0&&(ee=i.getUniformBlockIndex(pe,F.name),K.set(F,ee))}function ke(F,pe){let ee=c.get(pe).get(F);o.get(pe)!==ee&&(i.uniformBlockBinding(pe,ee,F.__bindingPointIndex),o.set(pe,ee))}function rt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),l={},V=null,k={},h={},u=new WeakMap,d=[],f=null,g=!1,y=null,p=null,m=null,_=null,x=null,b=null,C=null,A=new Ie(0,0,0),E=0,N=!1,j=null,v=null,M=null,L=null,U=null,Se.set(0,0,i.canvas.width,i.canvas.height),Ve.set(0,0,i.canvas.width,i.canvas.height),s.reset(),r.reset(),a.reset()}return{buffers:{color:s,depth:r,stencil:a},enable:B,disable:G,bindFramebuffer:ce,drawBuffers:ge,useProgram:Ue,setBlending:D,setMaterial:Jt,setFlipSided:Ge,setCullFace:Ye,setLineWidth:Pe,setPolygonOffset:at,setScissorTest:De,activeTexture:T,bindTexture:w,unbindTexture:W,compressedTexImage2D:Q,compressedTexImage3D:ne,texImage2D:_e,texImage3D:Le,updateUBOMapping:We,uniformBlockBinding:ke,texStorage2D:$e,texStorage3D:re,texSubImage2D:J,texSubImage3D:Me,compressedTexSubImage2D:ue,compressedTexSubImage3D:ye,scissor:Ne,viewport:ve,reset:rt}}function dd(i,e,t,n){let s=Bv(n);switch(t){case Od:return i*e;case Bd:return i*e;case zd:return i*e*2;case Dl:return i*e/s.components*s.byteLength;case Ul:return i*e/s.components*s.byteLength;case Hd:return i*e*2/s.components*s.byteLength;case kl:return i*e*2/s.components*s.byteLength;case Fd:return i*e*3/s.components*s.byteLength;case hn:return i*e*4/s.components*s.byteLength;case Ol:return i*e*4/s.components*s.byteLength;case ta:case na:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ia:case sa:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Cc:case Pc:return Math.max(i,16)*Math.max(e,8)/4;case Rc:case Ic:return Math.max(i,8)*Math.max(e,8)/2;case Lc:case Nc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Dc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Uc:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case kc:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Oc:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Fc:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Bc:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case zc:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Hc:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Vc:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Gc:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Wc:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Xc:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case qc:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Yc:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case $c:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case ra:case jc:case Kc:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Vd:case Zc:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Jc:case Qc:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Bv(i){switch(i){case Hn:case Dd:return{byteLength:1,components:1};case er:case Ud:case fr:return{byteLength:2,components:1};case Ll:case Nl:return{byteLength:2,components:4};case Ni:case Pl:case vn:return{byteLength:4,components:1};case kd:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${i}.`)}function zv(i,e,t,n,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new Te,h=new WeakMap,u,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(T,w){return f?new OffscreenCanvas(T,w):tr("canvas")}function y(T,w,W){let Q=1,ne=De(T);if((ne.width>W||ne.height>W)&&(Q=W/Math.max(ne.width,ne.height)),Q<1)if(typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&T instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&T instanceof ImageBitmap||typeof VideoFrame<"u"&&T instanceof VideoFrame){let J=Math.floor(Q*ne.width),Me=Math.floor(Q*ne.height);u===void 0&&(u=g(J,Me));let ue=w?g(J,Me):u;return ue.width=J,ue.height=Me,ue.getContext("2d").drawImage(T,0,0,J,Me),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ne.width+"x"+ne.height+") to ("+J+"x"+Me+")."),ue}else return"data"in T&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ne.width+"x"+ne.height+")."),T;return T}function p(T){return T.generateMipmaps&&T.minFilter!==kt&&T.minFilter!==Xt}function m(T){i.generateMipmap(T)}function _(T,w,W,Q,ne=!1){if(T!==null){if(i[T]!==void 0)return i[T];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+T+"'")}let J=w;if(w===i.RED&&(W===i.FLOAT&&(J=i.R32F),W===i.HALF_FLOAT&&(J=i.R16F),W===i.UNSIGNED_BYTE&&(J=i.R8)),w===i.RED_INTEGER&&(W===i.UNSIGNED_BYTE&&(J=i.R8UI),W===i.UNSIGNED_SHORT&&(J=i.R16UI),W===i.UNSIGNED_INT&&(J=i.R32UI),W===i.BYTE&&(J=i.R8I),W===i.SHORT&&(J=i.R16I),W===i.INT&&(J=i.R32I)),w===i.RG&&(W===i.FLOAT&&(J=i.RG32F),W===i.HALF_FLOAT&&(J=i.RG16F),W===i.UNSIGNED_BYTE&&(J=i.RG8)),w===i.RG_INTEGER&&(W===i.UNSIGNED_BYTE&&(J=i.RG8UI),W===i.UNSIGNED_SHORT&&(J=i.RG16UI),W===i.UNSIGNED_INT&&(J=i.RG32UI),W===i.BYTE&&(J=i.RG8I),W===i.SHORT&&(J=i.RG16I),W===i.INT&&(J=i.RG32I)),w===i.RGB_INTEGER&&(W===i.UNSIGNED_BYTE&&(J=i.RGB8UI),W===i.UNSIGNED_SHORT&&(J=i.RGB16UI),W===i.UNSIGNED_INT&&(J=i.RGB32UI),W===i.BYTE&&(J=i.RGB8I),W===i.SHORT&&(J=i.RGB16I),W===i.INT&&(J=i.RGB32I)),w===i.RGBA_INTEGER&&(W===i.UNSIGNED_BYTE&&(J=i.RGBA8UI),W===i.UNSIGNED_SHORT&&(J=i.RGBA16UI),W===i.UNSIGNED_INT&&(J=i.RGBA32UI),W===i.BYTE&&(J=i.RGBA8I),W===i.SHORT&&(J=i.RGBA16I),W===i.INT&&(J=i.RGBA32I)),w===i.RGB&&W===i.UNSIGNED_INT_5_9_9_9_REV&&(J=i.RGB9_E5),w===i.RGBA){let Me=ne?ca:qe.getTransfer(Q);W===i.FLOAT&&(J=i.RGBA32F),W===i.HALF_FLOAT&&(J=i.RGBA16F),W===i.UNSIGNED_BYTE&&(J=Me===ct?i.SRGB8_ALPHA8:i.RGBA8),W===i.UNSIGNED_SHORT_4_4_4_4&&(J=i.RGBA4),W===i.UNSIGNED_SHORT_5_5_5_1&&(J=i.RGB5_A1)}return(J===i.R16F||J===i.R32F||J===i.RG16F||J===i.RG32F||J===i.RGBA16F||J===i.RGBA32F)&&e.get("EXT_color_buffer_float"),J}function x(T,w){let W;return T?w===null||w===Ni||w===gs?W=i.DEPTH24_STENCIL8:w===vn?W=i.DEPTH32F_STENCIL8:w===er&&(W=i.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):w===null||w===Ni||w===gs?W=i.DEPTH_COMPONENT24:w===vn?W=i.DEPTH_COMPONENT32F:w===er&&(W=i.DEPTH_COMPONENT16),W}function b(T,w){return p(T)===!0||T.isFramebufferTexture&&T.minFilter!==kt&&T.minFilter!==Xt?Math.log2(Math.max(w.width,w.height))+1:T.mipmaps!==void 0&&T.mipmaps.length>0?T.mipmaps.length:T.isCompressedTexture&&Array.isArray(T.image)?w.mipmaps.length:1}function C(T){let w=T.target;w.removeEventListener("dispose",C),E(w),w.isVideoTexture&&h.delete(w)}function A(T){let w=T.target;w.removeEventListener("dispose",A),j(w)}function E(T){let w=n.get(T);if(w.__webglInit===void 0)return;let W=T.source,Q=d.get(W);if(Q){let ne=Q[w.__cacheKey];ne.usedTimes--,ne.usedTimes===0&&N(T),Object.keys(Q).length===0&&d.delete(W)}n.remove(T)}function N(T){let w=n.get(T);i.deleteTexture(w.__webglTexture);let W=T.source,Q=d.get(W);delete Q[w.__cacheKey],a.memory.textures--}function j(T){let w=n.get(T);if(T.depthTexture&&T.depthTexture.dispose(),T.isWebGLCubeRenderTarget)for(let Q=0;Q<6;Q++){if(Array.isArray(w.__webglFramebuffer[Q]))for(let ne=0;ne<w.__webglFramebuffer[Q].length;ne++)i.deleteFramebuffer(w.__webglFramebuffer[Q][ne]);else i.deleteFramebuffer(w.__webglFramebuffer[Q]);w.__webglDepthbuffer&&i.deleteRenderbuffer(w.__webglDepthbuffer[Q])}else{if(Array.isArray(w.__webglFramebuffer))for(let Q=0;Q<w.__webglFramebuffer.length;Q++)i.deleteFramebuffer(w.__webglFramebuffer[Q]);else i.deleteFramebuffer(w.__webglFramebuffer);if(w.__webglDepthbuffer&&i.deleteRenderbuffer(w.__webglDepthbuffer),w.__webglMultisampledFramebuffer&&i.deleteFramebuffer(w.__webglMultisampledFramebuffer),w.__webglColorRenderbuffer)for(let Q=0;Q<w.__webglColorRenderbuffer.length;Q++)w.__webglColorRenderbuffer[Q]&&i.deleteRenderbuffer(w.__webglColorRenderbuffer[Q]);w.__webglDepthRenderbuffer&&i.deleteRenderbuffer(w.__webglDepthRenderbuffer)}let W=T.textures;for(let Q=0,ne=W.length;Q<ne;Q++){let J=n.get(W[Q]);J.__webglTexture&&(i.deleteTexture(J.__webglTexture),a.memory.textures--),n.remove(W[Q])}n.remove(T)}let v=0;function M(){v=0}function L(){let T=v;return T>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+T+" texture units while this GPU supports only "+s.maxTextures),v+=1,T}function U(T){let w=[];return w.push(T.wrapS),w.push(T.wrapT),w.push(T.wrapR||0),w.push(T.magFilter),w.push(T.minFilter),w.push(T.anisotropy),w.push(T.internalFormat),w.push(T.format),w.push(T.type),w.push(T.generateMipmaps),w.push(T.premultiplyAlpha),w.push(T.flipY),w.push(T.unpackAlignment),w.push(T.colorSpace),w.join()}function I(T,w){let W=n.get(T);if(T.isVideoTexture&&Pe(T),T.isRenderTargetTexture===!1&&T.version>0&&W.__version!==T.version){let Q=T.image;if(Q===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Q.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{Ve(W,T,w);return}}t.bindTexture(i.TEXTURE_2D,W.__webglTexture,i.TEXTURE0+w)}function R(T,w){let W=n.get(T);if(T.version>0&&W.__version!==T.version){Ve(W,T,w);return}t.bindTexture(i.TEXTURE_2D_ARRAY,W.__webglTexture,i.TEXTURE0+w)}function P(T,w){let W=n.get(T);if(T.version>0&&W.__version!==T.version){Ve(W,T,w);return}t.bindTexture(i.TEXTURE_3D,W.__webglTexture,i.TEXTURE0+w)}function $(T,w){let W=n.get(T);if(T.version>0&&W.__version!==T.version){Z(W,T,w);return}t.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture,i.TEXTURE0+w)}let V={[Li]:i.REPEAT,[Bn]:i.CLAMP_TO_EDGE,[Qs]:i.MIRRORED_REPEAT},k={[kt]:i.NEAREST,[Il]:i.NEAREST_MIPMAP_NEAREST,[rs]:i.NEAREST_MIPMAP_LINEAR,[Xt]:i.LINEAR,[js]:i.LINEAR_MIPMAP_NEAREST,[Sn]:i.LINEAR_MIPMAP_LINEAR},Y={[Tm]:i.NEVER,[Nm]:i.ALWAYS,[Rm]:i.LESS,[Xd]:i.LEQUAL,[Cm]:i.EQUAL,[Lm]:i.GEQUAL,[Im]:i.GREATER,[Pm]:i.NOTEQUAL};function se(T,w){if(w.type===vn&&e.has("OES_texture_float_linear")===!1&&(w.magFilter===Xt||w.magFilter===js||w.magFilter===rs||w.magFilter===Sn||w.minFilter===Xt||w.minFilter===js||w.minFilter===rs||w.minFilter===Sn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(T,i.TEXTURE_WRAP_S,V[w.wrapS]),i.texParameteri(T,i.TEXTURE_WRAP_T,V[w.wrapT]),(T===i.TEXTURE_3D||T===i.TEXTURE_2D_ARRAY)&&i.texParameteri(T,i.TEXTURE_WRAP_R,V[w.wrapR]),i.texParameteri(T,i.TEXTURE_MAG_FILTER,k[w.magFilter]),i.texParameteri(T,i.TEXTURE_MIN_FILTER,k[w.minFilter]),w.compareFunction&&(i.texParameteri(T,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(T,i.TEXTURE_COMPARE_FUNC,Y[w.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(w.magFilter===kt||w.minFilter!==rs&&w.minFilter!==Sn||w.type===vn&&e.has("OES_texture_float_linear")===!1)return;if(w.anisotropy>1||n.get(w).__currentAnisotropy){let W=e.get("EXT_texture_filter_anisotropic");i.texParameterf(T,W.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(w.anisotropy,s.getMaxAnisotropy())),n.get(w).__currentAnisotropy=w.anisotropy}}}function Se(T,w){let W=!1;T.__webglInit===void 0&&(T.__webglInit=!0,w.addEventListener("dispose",C));let Q=w.source,ne=d.get(Q);ne===void 0&&(ne={},d.set(Q,ne));let J=U(w);if(J!==T.__cacheKey){ne[J]===void 0&&(ne[J]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,W=!0),ne[J].usedTimes++;let Me=ne[T.__cacheKey];Me!==void 0&&(ne[T.__cacheKey].usedTimes--,Me.usedTimes===0&&N(w)),T.__cacheKey=J,T.__webglTexture=ne[J].texture}return W}function Ve(T,w,W){let Q=i.TEXTURE_2D;(w.isDataArrayTexture||w.isCompressedArrayTexture)&&(Q=i.TEXTURE_2D_ARRAY),w.isData3DTexture&&(Q=i.TEXTURE_3D);let ne=Se(T,w),J=w.source;t.bindTexture(Q,T.__webglTexture,i.TEXTURE0+W);let Me=n.get(J);if(J.version!==Me.__version||ne===!0){t.activeTexture(i.TEXTURE0+W);let ue=qe.getPrimaries(qe.workingColorSpace),ye=w.colorSpace===ii?null:qe.getPrimaries(w.colorSpace),$e=w.colorSpace===ii||ue===ye?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,w.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,w.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,$e);let re=y(w.image,!1,s.maxTextureSize);re=at(w,re);let _e=r.convert(w.format,w.colorSpace),Le=r.convert(w.type),Ne=_(w.internalFormat,_e,Le,w.colorSpace,w.isVideoTexture);se(Q,w);let ve,We=w.mipmaps,ke=w.isVideoTexture!==!0,rt=Me.__version===void 0||ne===!0,F=J.dataReady,pe=b(w,re);if(w.isDepthTexture)Ne=x(w.format===ys,w.type),rt&&(ke?t.texStorage2D(i.TEXTURE_2D,1,Ne,re.width,re.height):t.texImage2D(i.TEXTURE_2D,0,Ne,re.width,re.height,0,_e,Le,null));else if(w.isDataTexture)if(We.length>0){ke&&rt&&t.texStorage2D(i.TEXTURE_2D,pe,Ne,We[0].width,We[0].height);for(let K=0,ee=We.length;K<ee;K++)ve=We[K],ke?F&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,ve.width,ve.height,_e,Le,ve.data):t.texImage2D(i.TEXTURE_2D,K,Ne,ve.width,ve.height,0,_e,Le,ve.data);w.generateMipmaps=!1}else ke?(rt&&t.texStorage2D(i.TEXTURE_2D,pe,Ne,re.width,re.height),F&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,re.width,re.height,_e,Le,re.data)):t.texImage2D(i.TEXTURE_2D,0,Ne,re.width,re.height,0,_e,Le,re.data);else if(w.isCompressedTexture)if(w.isCompressedArrayTexture){ke&&rt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,pe,Ne,We[0].width,We[0].height,re.depth);for(let K=0,ee=We.length;K<ee;K++)if(ve=We[K],w.format!==hn)if(_e!==null)if(ke){if(F)if(w.layerUpdates.size>0){let de=dd(ve.width,ve.height,w.format,w.type);for(let me of w.layerUpdates){let Xe=ve.data.subarray(me*de/ve.data.BYTES_PER_ELEMENT,(me+1)*de/ve.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,me,ve.width,ve.height,1,_e,Xe,0,0)}w.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,ve.width,ve.height,re.depth,_e,ve.data,0,0)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,K,Ne,ve.width,ve.height,re.depth,0,ve.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ke?F&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,ve.width,ve.height,re.depth,_e,Le,ve.data):t.texImage3D(i.TEXTURE_2D_ARRAY,K,Ne,ve.width,ve.height,re.depth,0,_e,Le,ve.data)}else{ke&&rt&&t.texStorage2D(i.TEXTURE_2D,pe,Ne,We[0].width,We[0].height);for(let K=0,ee=We.length;K<ee;K++)ve=We[K],w.format!==hn?_e!==null?ke?F&&t.compressedTexSubImage2D(i.TEXTURE_2D,K,0,0,ve.width,ve.height,_e,ve.data):t.compressedTexImage2D(i.TEXTURE_2D,K,Ne,ve.width,ve.height,0,ve.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ke?F&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,ve.width,ve.height,_e,Le,ve.data):t.texImage2D(i.TEXTURE_2D,K,Ne,ve.width,ve.height,0,_e,Le,ve.data)}else if(w.isDataArrayTexture)if(ke){if(rt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,pe,Ne,re.width,re.height,re.depth),F)if(w.layerUpdates.size>0){let K=dd(re.width,re.height,w.format,w.type);for(let ee of w.layerUpdates){let de=re.data.subarray(ee*K/re.data.BYTES_PER_ELEMENT,(ee+1)*K/re.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ee,re.width,re.height,1,_e,Le,de)}w.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,re.width,re.height,re.depth,_e,Le,re.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Ne,re.width,re.height,re.depth,0,_e,Le,re.data);else if(w.isData3DTexture)ke?(rt&&t.texStorage3D(i.TEXTURE_3D,pe,Ne,re.width,re.height,re.depth),F&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,re.width,re.height,re.depth,_e,Le,re.data)):t.texImage3D(i.TEXTURE_3D,0,Ne,re.width,re.height,re.depth,0,_e,Le,re.data);else if(w.isFramebufferTexture){if(rt)if(ke)t.texStorage2D(i.TEXTURE_2D,pe,Ne,re.width,re.height);else{let K=re.width,ee=re.height;for(let de=0;de<pe;de++)t.texImage2D(i.TEXTURE_2D,de,Ne,K,ee,0,_e,Le,null),K>>=1,ee>>=1}}else if(We.length>0){if(ke&&rt){let K=De(We[0]);t.texStorage2D(i.TEXTURE_2D,pe,Ne,K.width,K.height)}for(let K=0,ee=We.length;K<ee;K++)ve=We[K],ke?F&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,_e,Le,ve):t.texImage2D(i.TEXTURE_2D,K,Ne,_e,Le,ve);w.generateMipmaps=!1}else if(ke){if(rt){let K=De(re);t.texStorage2D(i.TEXTURE_2D,pe,Ne,K.width,K.height)}F&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,_e,Le,re)}else t.texImage2D(i.TEXTURE_2D,0,Ne,_e,Le,re);p(w)&&m(Q),Me.__version=J.version,w.onUpdate&&w.onUpdate(w)}T.__version=w.version}function Z(T,w,W){if(w.image.length!==6)return;let Q=Se(T,w),ne=w.source;t.bindTexture(i.TEXTURE_CUBE_MAP,T.__webglTexture,i.TEXTURE0+W);let J=n.get(ne);if(ne.version!==J.__version||Q===!0){t.activeTexture(i.TEXTURE0+W);let Me=qe.getPrimaries(qe.workingColorSpace),ue=w.colorSpace===ii?null:qe.getPrimaries(w.colorSpace),ye=w.colorSpace===ii||Me===ue?i.NONE:i.BROWSER_DEFAULT_WEBGL;i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,w.flipY),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,w.premultiplyAlpha),i.pixelStorei(i.UNPACK_ALIGNMENT,w.unpackAlignment),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ye);let $e=w.isCompressedTexture||w.image[0].isCompressedTexture,re=w.image[0]&&w.image[0].isDataTexture,_e=[];for(let ee=0;ee<6;ee++)!$e&&!re?_e[ee]=y(w.image[ee],!0,s.maxCubemapSize):_e[ee]=re?w.image[ee].image:w.image[ee],_e[ee]=at(w,_e[ee]);let Le=_e[0],Ne=r.convert(w.format,w.colorSpace),ve=r.convert(w.type),We=_(w.internalFormat,Ne,ve,w.colorSpace),ke=w.isVideoTexture!==!0,rt=J.__version===void 0||Q===!0,F=ne.dataReady,pe=b(w,Le);se(i.TEXTURE_CUBE_MAP,w);let K;if($e){ke&&rt&&t.texStorage2D(i.TEXTURE_CUBE_MAP,pe,We,Le.width,Le.height);for(let ee=0;ee<6;ee++){K=_e[ee].mipmaps;for(let de=0;de<K.length;de++){let me=K[de];w.format!==hn?Ne!==null?ke?F&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de,0,0,me.width,me.height,Ne,me.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de,We,me.width,me.height,0,me.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):ke?F&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de,0,0,me.width,me.height,Ne,ve,me.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de,We,me.width,me.height,0,Ne,ve,me.data)}}}else{if(K=w.mipmaps,ke&&rt){K.length>0&&pe++;let ee=De(_e[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,pe,We,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(re){ke?F&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,_e[ee].width,_e[ee].height,Ne,ve,_e[ee].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,We,_e[ee].width,_e[ee].height,0,Ne,ve,_e[ee].data);for(let de=0;de<K.length;de++){let Xe=K[de].image[ee].image;ke?F&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de+1,0,0,Xe.width,Xe.height,Ne,ve,Xe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de+1,We,Xe.width,Xe.height,0,Ne,ve,Xe.data)}}else{ke?F&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Ne,ve,_e[ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,We,Ne,ve,_e[ee]);for(let de=0;de<K.length;de++){let me=K[de];ke?F&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de+1,0,0,Ne,ve,me.image[ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,de+1,We,Ne,ve,me.image[ee])}}}p(w)&&m(i.TEXTURE_CUBE_MAP),J.__version=ne.version,w.onUpdate&&w.onUpdate(w)}T.__version=w.version}function ie(T,w,W,Q,ne,J){let Me=r.convert(W.format,W.colorSpace),ue=r.convert(W.type),ye=_(W.internalFormat,Me,ue,W.colorSpace);if(!n.get(w).__hasExternalTextures){let re=Math.max(1,w.width>>J),_e=Math.max(1,w.height>>J);ne===i.TEXTURE_3D||ne===i.TEXTURE_2D_ARRAY?t.texImage3D(ne,J,ye,re,_e,w.depth,0,Me,ue,null):t.texImage2D(ne,J,ye,re,_e,0,Me,ue,null)}t.bindFramebuffer(i.FRAMEBUFFER,T),Ye(w)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Q,ne,n.get(W).__webglTexture,0,Ge(w)):(ne===i.TEXTURE_2D||ne>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ne<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,Q,ne,n.get(W).__webglTexture,J),t.bindFramebuffer(i.FRAMEBUFFER,null)}function B(T,w,W){if(i.bindRenderbuffer(i.RENDERBUFFER,T),w.depthBuffer){let Q=w.depthTexture,ne=Q&&Q.isDepthTexture?Q.type:null,J=x(w.stencilBuffer,ne),Me=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ue=Ge(w);Ye(w)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ue,J,w.width,w.height):W?i.renderbufferStorageMultisample(i.RENDERBUFFER,ue,J,w.width,w.height):i.renderbufferStorage(i.RENDERBUFFER,J,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Me,i.RENDERBUFFER,T)}else{let Q=w.textures;for(let ne=0;ne<Q.length;ne++){let J=Q[ne],Me=r.convert(J.format,J.colorSpace),ue=r.convert(J.type),ye=_(J.internalFormat,Me,ue,J.colorSpace),$e=Ge(w);W&&Ye(w)===!1?i.renderbufferStorageMultisample(i.RENDERBUFFER,$e,ye,w.width,w.height):Ye(w)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,$e,ye,w.width,w.height):i.renderbufferStorage(i.RENDERBUFFER,ye,w.width,w.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function G(T,w){if(w&&w.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(i.FRAMEBUFFER,T),!(w.depthTexture&&w.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(w.depthTexture).__webglTexture||w.depthTexture.image.width!==w.width||w.depthTexture.image.height!==w.height)&&(w.depthTexture.image.width=w.width,w.depthTexture.image.height=w.height,w.depthTexture.needsUpdate=!0),I(w.depthTexture,0);let Q=n.get(w.depthTexture).__webglTexture,ne=Ge(w);if(w.depthTexture.format===hs)Ye(w)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,Q,0,ne):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_ATTACHMENT,i.TEXTURE_2D,Q,0);else if(w.depthTexture.format===ys)Ye(w)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,Q,0,ne):i.framebufferTexture2D(i.FRAMEBUFFER,i.DEPTH_STENCIL_ATTACHMENT,i.TEXTURE_2D,Q,0);else throw new Error("Unknown depthTexture format")}function ce(T){let w=n.get(T),W=T.isWebGLCubeRenderTarget===!0;if(w.__boundDepthTexture!==T.depthTexture){let Q=T.depthTexture;if(w.__depthDisposeCallback&&w.__depthDisposeCallback(),Q){let ne=()=>{delete w.__boundDepthTexture,delete w.__depthDisposeCallback,Q.removeEventListener("dispose",ne)};Q.addEventListener("dispose",ne),w.__depthDisposeCallback=ne}w.__boundDepthTexture=Q}if(T.depthTexture&&!w.__autoAllocateDepthBuffer){if(W)throw new Error("target.depthTexture not supported in Cube render targets");G(w.__webglFramebuffer,T)}else if(W){w.__webglDepthbuffer=[];for(let Q=0;Q<6;Q++)if(t.bindFramebuffer(i.FRAMEBUFFER,w.__webglFramebuffer[Q]),w.__webglDepthbuffer[Q]===void 0)w.__webglDepthbuffer[Q]=i.createRenderbuffer(),B(w.__webglDepthbuffer[Q],T,!1);else{let ne=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,J=w.__webglDepthbuffer[Q];i.bindRenderbuffer(i.RENDERBUFFER,J),i.framebufferRenderbuffer(i.FRAMEBUFFER,ne,i.RENDERBUFFER,J)}}else if(t.bindFramebuffer(i.FRAMEBUFFER,w.__webglFramebuffer),w.__webglDepthbuffer===void 0)w.__webglDepthbuffer=i.createRenderbuffer(),B(w.__webglDepthbuffer,T,!1);else{let Q=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ne=w.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ne),i.framebufferRenderbuffer(i.FRAMEBUFFER,Q,i.RENDERBUFFER,ne)}t.bindFramebuffer(i.FRAMEBUFFER,null)}function ge(T,w,W){let Q=n.get(T);w!==void 0&&ie(Q.__webglFramebuffer,T,T.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),W!==void 0&&ce(T)}function Ue(T){let w=T.texture,W=n.get(T),Q=n.get(w);T.addEventListener("dispose",A);let ne=T.textures,J=T.isWebGLCubeRenderTarget===!0,Me=ne.length>1;if(Me||(Q.__webglTexture===void 0&&(Q.__webglTexture=i.createTexture()),Q.__version=w.version,a.memory.textures++),J){W.__webglFramebuffer=[];for(let ue=0;ue<6;ue++)if(w.mipmaps&&w.mipmaps.length>0){W.__webglFramebuffer[ue]=[];for(let ye=0;ye<w.mipmaps.length;ye++)W.__webglFramebuffer[ue][ye]=i.createFramebuffer()}else W.__webglFramebuffer[ue]=i.createFramebuffer()}else{if(w.mipmaps&&w.mipmaps.length>0){W.__webglFramebuffer=[];for(let ue=0;ue<w.mipmaps.length;ue++)W.__webglFramebuffer[ue]=i.createFramebuffer()}else W.__webglFramebuffer=i.createFramebuffer();if(Me)for(let ue=0,ye=ne.length;ue<ye;ue++){let $e=n.get(ne[ue]);$e.__webglTexture===void 0&&($e.__webglTexture=i.createTexture(),a.memory.textures++)}if(T.samples>0&&Ye(T)===!1){W.__webglMultisampledFramebuffer=i.createFramebuffer(),W.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let ue=0;ue<ne.length;ue++){let ye=ne[ue];W.__webglColorRenderbuffer[ue]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,W.__webglColorRenderbuffer[ue]);let $e=r.convert(ye.format,ye.colorSpace),re=r.convert(ye.type),_e=_(ye.internalFormat,$e,re,ye.colorSpace,T.isXRRenderTarget===!0),Le=Ge(T);i.renderbufferStorageMultisample(i.RENDERBUFFER,Le,_e,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.RENDERBUFFER,W.__webglColorRenderbuffer[ue])}i.bindRenderbuffer(i.RENDERBUFFER,null),T.depthBuffer&&(W.__webglDepthRenderbuffer=i.createRenderbuffer(),B(W.__webglDepthRenderbuffer,T,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(J){t.bindTexture(i.TEXTURE_CUBE_MAP,Q.__webglTexture),se(i.TEXTURE_CUBE_MAP,w);for(let ue=0;ue<6;ue++)if(w.mipmaps&&w.mipmaps.length>0)for(let ye=0;ye<w.mipmaps.length;ye++)ie(W.__webglFramebuffer[ue][ye],T,w,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ue,ye);else ie(W.__webglFramebuffer[ue],T,w,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ue,0);p(w)&&m(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Me){for(let ue=0,ye=ne.length;ue<ye;ue++){let $e=ne[ue],re=n.get($e);t.bindTexture(i.TEXTURE_2D,re.__webglTexture),se(i.TEXTURE_2D,$e),ie(W.__webglFramebuffer,T,$e,i.COLOR_ATTACHMENT0+ue,i.TEXTURE_2D,0),p($e)&&m(i.TEXTURE_2D)}t.unbindTexture()}else{let ue=i.TEXTURE_2D;if((T.isWebGL3DRenderTarget||T.isWebGLArrayRenderTarget)&&(ue=T.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ue,Q.__webglTexture),se(ue,w),w.mipmaps&&w.mipmaps.length>0)for(let ye=0;ye<w.mipmaps.length;ye++)ie(W.__webglFramebuffer[ye],T,w,i.COLOR_ATTACHMENT0,ue,ye);else ie(W.__webglFramebuffer,T,w,i.COLOR_ATTACHMENT0,ue,0);p(w)&&m(ue),t.unbindTexture()}T.depthBuffer&&ce(T)}function Ze(T){let w=T.textures;for(let W=0,Q=w.length;W<Q;W++){let ne=w[W];if(p(ne)){let J=T.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:i.TEXTURE_2D,Me=n.get(ne).__webglTexture;t.bindTexture(J,Me),m(J),t.unbindTexture()}}}let ze=[],D=[];function Jt(T){if(T.samples>0){if(Ye(T)===!1){let w=T.textures,W=T.width,Q=T.height,ne=i.COLOR_BUFFER_BIT,J=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Me=n.get(T),ue=w.length>1;if(ue)for(let ye=0;ye<w.length;ye++)t.bindFramebuffer(i.FRAMEBUFFER,Me.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ye,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Me.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ye,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Me.__webglMultisampledFramebuffer),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Me.__webglFramebuffer);for(let ye=0;ye<w.length;ye++){if(T.resolveDepthBuffer&&(T.depthBuffer&&(ne|=i.DEPTH_BUFFER_BIT),T.stencilBuffer&&T.resolveStencilBuffer&&(ne|=i.STENCIL_BUFFER_BIT)),ue){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Me.__webglColorRenderbuffer[ye]);let $e=n.get(w[ye]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,$e,0)}i.blitFramebuffer(0,0,W,Q,0,0,W,Q,ne,i.NEAREST),c===!0&&(ze.length=0,D.length=0,ze.push(i.COLOR_ATTACHMENT0+ye),T.depthBuffer&&T.resolveDepthBuffer===!1&&(ze.push(J),D.push(J),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,D)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,ze))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ue)for(let ye=0;ye<w.length;ye++){t.bindFramebuffer(i.FRAMEBUFFER,Me.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ye,i.RENDERBUFFER,Me.__webglColorRenderbuffer[ye]);let $e=n.get(w[ye]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Me.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ye,i.TEXTURE_2D,$e,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Me.__webglMultisampledFramebuffer)}else if(T.depthBuffer&&T.resolveDepthBuffer===!1&&c){let w=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[w])}}}function Ge(T){return Math.min(s.maxSamples,T.samples)}function Ye(T){let w=n.get(T);return T.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&w.__useRenderToTexture!==!1}function Pe(T){let w=a.render.frame;h.get(T)!==w&&(h.set(T,w),T.update())}function at(T,w){let W=T.colorSpace,Q=T.format,ne=T.type;return T.isCompressedTexture===!0||T.isVideoTexture===!0||W!==Et&&W!==ii&&(qe.getTransfer(W)===ct?(Q!==hn||ne!==Hn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",W)),w}function De(T){return typeof HTMLImageElement<"u"&&T instanceof HTMLImageElement?(l.width=T.naturalWidth||T.width,l.height=T.naturalHeight||T.height):typeof VideoFrame<"u"&&T instanceof VideoFrame?(l.width=T.displayWidth,l.height=T.displayHeight):(l.width=T.width,l.height=T.height),l}this.allocateTextureUnit=L,this.resetTextureUnits=M,this.setTexture2D=I,this.setTexture2DArray=R,this.setTexture3D=P,this.setTextureCube=$,this.rebindTextures=ge,this.setupRenderTarget=Ue,this.updateRenderTargetMipmap=Ze,this.updateMultisampleRenderTarget=Jt,this.setupDepthRenderbuffer=ce,this.setupFrameBufferTexture=ie,this.useMultisampledRTT=Ye}function Hv(i,e){function t(n,s=ii){let r,a=qe.getTransfer(s);if(n===Hn)return i.UNSIGNED_BYTE;if(n===Ll)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Nl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===kd)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Dd)return i.BYTE;if(n===Ud)return i.SHORT;if(n===er)return i.UNSIGNED_SHORT;if(n===Pl)return i.INT;if(n===Ni)return i.UNSIGNED_INT;if(n===vn)return i.FLOAT;if(n===fr)return i.HALF_FLOAT;if(n===Od)return i.ALPHA;if(n===Fd)return i.RGB;if(n===hn)return i.RGBA;if(n===Bd)return i.LUMINANCE;if(n===zd)return i.LUMINANCE_ALPHA;if(n===hs)return i.DEPTH_COMPONENT;if(n===ys)return i.DEPTH_STENCIL;if(n===Dl)return i.RED;if(n===Ul)return i.RED_INTEGER;if(n===Hd)return i.RG;if(n===kl)return i.RG_INTEGER;if(n===Ol)return i.RGBA_INTEGER;if(n===ta||n===na||n===ia||n===sa)if(a===ct)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===ta)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===na)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===ia)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===sa)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===ta)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===na)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===ia)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===sa)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===Rc||n===Cc||n===Ic||n===Pc)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===Rc)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Cc)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Ic)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Pc)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Lc||n===Nc||n===Dc)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Lc||n===Nc)return a===ct?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Dc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===Uc||n===kc||n===Oc||n===Fc||n===Bc||n===zc||n===Hc||n===Vc||n===Gc||n===Wc||n===Xc||n===qc||n===Yc||n===$c)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Uc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===kc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Oc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Fc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Bc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===zc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Hc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Vc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Gc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Wc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Xc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===qc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Yc)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===$c)return a===ct?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===ra||n===jc||n===Kc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===ra)return a===ct?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===jc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Kc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Vd||n===Zc||n===Jc||n===Qc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===ra)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Zc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Jc)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Qc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===gs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}function qv(i,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,$d(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function s(p,m,_,x,b){m.isMeshBasicMaterial||m.isMeshLambertMaterial?r(p,m):m.isMeshToonMaterial?(r(p,m),u(p,m)):m.isMeshPhongMaterial?(r(p,m),h(p,m)):m.isMeshStandardMaterial?(r(p,m),d(p,m),m.isMeshPhysicalMaterial&&f(p,m,b)):m.isMeshMatcapMaterial?(r(p,m),g(p,m)):m.isMeshDepthMaterial?r(p,m):m.isMeshDistanceMaterial?(r(p,m),y(p,m)):m.isMeshNormalMaterial?r(p,m):m.isLineBasicMaterial?(a(p,m),m.isLineDashedMaterial&&o(p,m)):m.isPointsMaterial?c(p,m,_,x):m.isSpriteMaterial?l(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function r(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===qt&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===qt&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);let _=e.get(m),x=_.envMap,b=_.envMapRotation;x&&(p.envMap.value=x,Ti.copy(b),Ti.x*=-1,Ti.y*=-1,Ti.z*=-1,x.isCubeTexture&&x.isRenderTargetTexture===!1&&(Ti.y*=-1,Ti.z*=-1),p.envMapRotation.value.setFromMatrix4(Xv.makeRotationFromEuler(Ti)),p.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function a(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function o(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function c(p,m,_,x){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*_,p.scale.value=x*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function l(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function u(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,_){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===qt&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=_.texture,p.transmissionSamplerSize.value.set(_.width,_.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function y(p,m){let _=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(_.matrixWorld),p.nearDistance.value=_.shadow.camera.near,p.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Yv(i,e,t,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(_,x){let b=x.program;n.uniformBlockBinding(_,b)}function l(_,x){let b=s[_.id];b===void 0&&(g(_),b=h(_),s[_.id]=b,_.addEventListener("dispose",p));let C=x.program;n.updateUBOMapping(_,C);let A=e.render.frame;r[_.id]!==A&&(d(_),r[_.id]=A)}function h(_){let x=u();_.__bindingPointIndex=x;let b=i.createBuffer(),C=_.__size,A=_.usage;return i.bindBuffer(i.UNIFORM_BUFFER,b),i.bufferData(i.UNIFORM_BUFFER,C,A),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,x,b),b}function u(){for(let _=0;_<o;_++)if(a.indexOf(_)===-1)return a.push(_),_;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(_){let x=s[_.id],b=_.uniforms,C=_.__cache;i.bindBuffer(i.UNIFORM_BUFFER,x);for(let A=0,E=b.length;A<E;A++){let N=Array.isArray(b[A])?b[A]:[b[A]];for(let j=0,v=N.length;j<v;j++){let M=N[j];if(f(M,A,j,C)===!0){let L=M.__offset,U=Array.isArray(M.value)?M.value:[M.value],I=0;for(let R=0;R<U.length;R++){let P=U[R],$=y(P);typeof P=="number"||typeof P=="boolean"?(M.__data[0]=P,i.bufferSubData(i.UNIFORM_BUFFER,L+I,M.__data)):P.isMatrix3?(M.__data[0]=P.elements[0],M.__data[1]=P.elements[1],M.__data[2]=P.elements[2],M.__data[3]=0,M.__data[4]=P.elements[3],M.__data[5]=P.elements[4],M.__data[6]=P.elements[5],M.__data[7]=0,M.__data[8]=P.elements[6],M.__data[9]=P.elements[7],M.__data[10]=P.elements[8],M.__data[11]=0):(P.toArray(M.__data,I),I+=$.storage/Float32Array.BYTES_PER_ELEMENT)}i.bufferSubData(i.UNIFORM_BUFFER,L,M.__data)}}}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(_,x,b,C){let A=_.value,E=x+"_"+b;if(C[E]===void 0)return typeof A=="number"||typeof A=="boolean"?C[E]=A:C[E]=A.clone(),!0;{let N=C[E];if(typeof A=="number"||typeof A=="boolean"){if(N!==A)return C[E]=A,!0}else if(N.equals(A)===!1)return N.copy(A),!0}return!1}function g(_){let x=_.uniforms,b=0,C=16;for(let E=0,N=x.length;E<N;E++){let j=Array.isArray(x[E])?x[E]:[x[E]];for(let v=0,M=j.length;v<M;v++){let L=j[v],U=Array.isArray(L.value)?L.value:[L.value];for(let I=0,R=U.length;I<R;I++){let P=U[I],$=y(P),V=b%C,k=V%$.boundary,Y=V+k;b+=k,Y!==0&&C-Y<$.storage&&(b+=C-Y),L.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),L.__offset=b,b+=$.storage}}}let A=b%C;return A>0&&(b+=C-A),_.__size=b,_.__cache={},this}function y(_){let x={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(x.boundary=4,x.storage=4):_.isVector2?(x.boundary=8,x.storage=8):_.isVector3||_.isColor?(x.boundary=16,x.storage=12):_.isVector4?(x.boundary=16,x.storage=16):_.isMatrix3?(x.boundary=48,x.storage=48):_.isMatrix4?(x.boundary=64,x.storage=64):_.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",_),x}function p(_){let x=_.target;x.removeEventListener("dispose",p);let b=a.indexOf(x.__bindingPointIndex);a.splice(b,1),i.deleteBuffer(s[x.id]),delete s[x.id],delete r[x.id]}function m(){for(let _ in s)i.deleteBuffer(s[_]);a=[],s={},r={}}return{bind:c,update:l,dispose:m}}function Zr(i,e,t,n,s,r){let a=i.geometry.attributes.position;if(Ra.fromBufferAttribute(a,s),Ca.fromBufferAttribute(a,r),t.distanceSqToSegment(Ra,Ca,pc,Md)>n)return;pc.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(pc);if(!(c<e.near||c>e.far))return{distance:c,point:Md.clone().applyMatrix4(i.matrixWorld),index:s,face:null,faceIndex:null,barycoord:null,object:i}}function Ad(i,e,t,n,s,r,a){let o=yl.distanceSqToPoint(i);if(o<t){let c=new O;yl.closestPointToPoint(i,c),c.applyMatrix4(n);let l=s.ray.origin.distanceTo(c);if(l<s.near||l>s.far)return;r.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,faceIndex:null,barycoord:null,object:a})}}function ea(i,e,t){return!i||!t&&i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function Zv(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function Jv(i){function e(s,r){return i[s]-i[r]}let t=i.length,n=new Array(t);for(let s=0;s!==t;++s)n[s]=s;return n.sort(e),n}function Td(i,e,t){let n=i.length,s=new i.constructor(n);for(let r=0,a=0;a!==n;++r){let o=t[r]*e;for(let c=0;c!==e;++c)s[a++]=i[o+c]}return s}function ef(i,e,t,n){let s=1,r=i[0];for(;r!==void 0&&r[n]===void 0;)r=i[s++];if(r===void 0)return;let a=r[n];if(a!==void 0)if(Array.isArray(a))do a=r[n],a!==void 0&&(e.push(r.time),t.push.apply(t,a)),r=i[s++];while(r!==void 0);else if(a.toArray!==void 0)do a=r[n],a!==void 0&&(e.push(r.time),a.toArray(t,t.length)),r=i[s++];while(r!==void 0);else do a=r[n],a!==void 0&&(e.push(r.time),t.push(a)),r=i[s++];while(r!==void 0)}function Qv(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return Gn;case"vector":case"vector2":case"vector3":case"vector4":return Xn;case"color":return Oa;case"quaternion":return Wn;case"bool":case"boolean":return li;case"string":return hi}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function ex(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=Qv(i.type);if(i.times===void 0){let t=[],n=[];ef(i.keys,t,n,"value"),i.times=t,i.values=n}return e.parse!==void 0?e.parse(i):new e(i.name,i.times,i.values,i.interpolation)}var Ui,ki,Gp,vu,Wp,Pd,Xp,Fn,En,qt,sn,ri,ls,xu,bu,Mu,qp,Ci,Yp,$p,jp,Kp,Zp,Jp,Qp,em,yc,_c,tm,nm,im,sm,rm,am,om,cm,lm,vc,xc,bc,fs,Mc,wc,Sc,Ec,Ld,hm,um,ai,dm,fm,pm,mm,gm,ym,_m,wu,vm,Nd,ps,ms,Ac,Tc,Xa,Li,Bn,Qs,kt,Il,rs,Xt,js,Sn,Hn,Dd,Ud,er,Pl,Ni,vn,fr,Ll,Nl,gs,kd,Od,Fd,hn,Bd,zd,hs,ys,Dl,Ul,Hd,kl,Ol,ta,na,ia,sa,Rc,Cc,Ic,Pc,Lc,Nc,Dc,Uc,kc,Oc,Fc,Bc,zc,Hc,Vc,Gc,Wc,Xc,qc,Yc,$c,ra,jc,Kc,Vd,Zc,Jc,Qc,xm,bm,Mm,_s,vs,Fo,as,os,oa,Fl,wm,Gd,qa,pr,Sm,Em,Wd,Am,ii,Ut,Et,Bl,Ya,ca,ct,la,ha,Wi,Su,Tm,Rm,Cm,Xd,Im,Pm,Lm,Nm,el,Eu,zn,ua,An,Nt,Au,Ks,xs,As,Te,Be,Bo,Tu,Ru,Cu,Bs,eg,qe,Xi,tl,tg,da,ng,Lt,Ke,nl,Vn,fa,il,Pt,O,Vo,Iu,Yt,Ln,pn,Rr,qi,Yi,$i,Zn,Jn,Mi,zs,Cr,Ir,wi,ig,Hs,Wo,rn,Nn,Xo,Pr,Qn,qo,Lr,Yo,oi,Oe,ji,mn,sg,rg,ei,Nr,tn,Pu,Lu,Tn,pa,ag,Nu,Ki,Dn,Dr,Vs,og,cg,Du,Uu,ku,Ou,lg,Zi,$o,ut,gn,Un,jo,kn,Ji,Qi,Fu,Ko,Zo,Jo,Qo,ec,tc,Ii,Yd,ti,Ur,Ie,Dt,hg,an,$t,mt,kr,vt,ma,ga,ft,ug,ln,ic,es,nn,Gs,St,zt,Bu,Si,Or,zu,Fr,Br,zr,sc,Hr,Hu,Vr,gt,nr,pg,mg,gg,Rn,ya,ni,Vu,Gu,_t,ts,ns,sl,_a,rl,rc,yg,_g,yn,Ei,Wr,ir,va,xg,bg,Mg,wg,Sg,Eg,Ag,Tg,Rg,Cg,Ig,Pg,Lg,Ng,Dg,Ug,kg,Og,Fg,Bg,zg,Hg,Vg,Gg,Wg,Xg,qg,Yg,$g,jg,Kg,Zg,Jg,Qg,e0,t0,n0,i0,s0,r0,a0,o0,c0,l0,h0,u0,d0,f0,p0,m0,g0,y0,_0,v0,x0,b0,M0,w0,S0,E0,A0,T0,R0,C0,I0,P0,L0,N0,D0,U0,k0,O0,F0,B0,z0,H0,V0,G0,W0,X0,q0,Y0,$0,j0,K0,Z0,J0,Q0,ey,ty,ny,iy,sy,ry,ay,oy,cy,ly,hy,uy,dy,fy,py,my,gy,yy,_y,vy,xy,by,My,wy,Sy,Ey,Ay,Ty,Ry,Cy,Iy,Py,Ly,Ny,Dy,Uy,ky,Oy,Fy,By,zy,Hy,Vy,Gy,Wy,Xy,qy,Yy,$y,jy,Ky,Zy,Jy,Fe,le,wn,Xr,Ai,Qy,Ms,cs,Wu,Pi,ac,Xu,oc,cc,lc,hc,Ri,is,qu,xa,ba,Kd,Ku,Zd,Jd,Qd,Zu,Ju,Qu,ed,td,al,ol,cl,uc,ds,nv,iv,Yr,dv,fv,mv,wv,hl,ul,Iv,dl,fl,Dv,Uv,Ov,pl,Bt,Vv,Js,Gv,Wv,ml,gl,Ti,Xv,Ma,wa,sr,Ot,rr,fd,pd,md,$v,gd,$r,dc,yd,fc,Sa,ar,Ea,_d,jv,Aa,Di,ss,vd,jr,xd,Kv,Ws,Xs,Ta,or,Ra,Ca,bd,qs,Kr,pc,Md,ws,wd,Sd,Ia,Pa,cr,Ed,yl,Jr,Qr,La,Na,Da,Ua,Ss,on,ci,_l,ka,vl,un,li,Oa,Gn,xl,Wn,hi,Xn,Es,si,bl,tx,qn,On,Ml,lr,wl,Fa,hr,mc,Rd,Cd,ur,Sl,Ba,Id,Ys,gc,El,za,Al,Ha,ui,Va,Tl,Vl,nx,Gl,ix,sx,rx,ax,ox,cx,lx,Rl,st,Cl,hx,Ga,dr,Wa,mr=lt(()=>{Ui={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},ki={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Gp=0,vu=1,Wp=2,Pd=1,Xp=2,Fn=3,En=0,qt=1,sn=2,ri=0,ls=1,xu=2,bu=3,Mu=4,qp=5,Ci=100,Yp=101,$p=102,jp=103,Kp=104,Zp=200,Jp=201,Qp=202,em=203,yc=204,_c=205,tm=206,nm=207,im=208,sm=209,rm=210,am=211,om=212,cm=213,lm=214,vc=0,xc=1,bc=2,fs=3,Mc=4,wc=5,Sc=6,Ec=7,Ld=0,hm=1,um=2,ai=0,dm=1,fm=2,pm=3,mm=4,gm=5,ym=6,_m=7,wu="attached",vm="detached",Nd=300,ps=301,ms=302,Ac=303,Tc=304,Xa=306,Li=1e3,Bn=1001,Qs=1002,kt=1003,Il=1004,rs=1005,Xt=1006,js=1007,Sn=1008,Hn=1009,Dd=1010,Ud=1011,er=1012,Pl=1013,Ni=1014,vn=1015,fr=1016,Ll=1017,Nl=1018,gs=1020,kd=35902,Od=1021,Fd=1022,hn=1023,Bd=1024,zd=1025,hs=1026,ys=1027,Dl=1028,Ul=1029,Hd=1030,kl=1031,Ol=1033,ta=33776,na=33777,ia=33778,sa=33779,Rc=35840,Cc=35841,Ic=35842,Pc=35843,Lc=36196,Nc=37492,Dc=37496,Uc=37808,kc=37809,Oc=37810,Fc=37811,Bc=37812,zc=37813,Hc=37814,Vc=37815,Gc=37816,Wc=37817,Xc=37818,qc=37819,Yc=37820,$c=37821,ra=36492,jc=36494,Kc=36495,Vd=36283,Zc=36284,Jc=36285,Qc=36286,xm=2200,bm=2201,Mm=2202,_s=2300,vs=2301,Fo=2302,as=2400,os=2401,oa=2402,Fl=2500,wm=2501,Gd=0,qa=1,pr=2,Sm=3200,Em=3201,Wd=0,Am=1,ii="",Ut="srgb",Et="srgb-linear",Bl="display-p3",Ya="display-p3-linear",ca="linear",ct="srgb",la="rec709",ha="p3",Wi=7680,Su=519,Tm=512,Rm=513,Cm=514,Xd=515,Im=516,Pm=517,Lm=518,Nm=519,el=35044,Eu="300 es",zn=2e3,ua=2001,An=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let s=this._listeners[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let n=this._listeners[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}},Nt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Au=1234567,Ks=Math.PI/180,xs=180/Math.PI;As={DEG2RAD:Ks,RAD2DEG:xs,generateUUID:xn,clamp:It,euclideanModulo:zl,mapLinear:Dm,inverseLerp:Um,lerp:Zs,damp:km,pingpong:Om,smoothstep:Fm,smootherstep:Bm,randInt:zm,randFloat:Hm,randFloatSpread:Vm,seededRandom:Gm,degToRad:Wm,radToDeg:Xm,isPowerOfTwo:qm,ceilPowerOfTwo:Ym,floorPowerOfTwo:$m,setQuaternionFromProperEuler:jm,normalize:tt,denormalize:_n},Te=class i{constructor(e=0,t=0){i.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(It(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Be=class i{constructor(e,t,n,s,r,a,o,c,l){i.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l)}set(e,t,n,s,r,a,o,c,l){let h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],u=n[7],d=n[2],f=n[5],g=n[8],y=s[0],p=s[3],m=s[6],_=s[1],x=s[4],b=s[7],C=s[2],A=s[5],E=s[8];return r[0]=a*y+o*_+c*C,r[3]=a*p+o*x+c*A,r[6]=a*m+o*b+c*E,r[1]=l*y+h*_+u*C,r[4]=l*p+h*x+u*A,r[7]=l*m+h*b+u*E,r[2]=d*y+f*_+g*C,r[5]=d*p+f*x+g*A,r[8]=d*m+f*b+g*E,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*a*h-t*o*l-n*r*h+n*o*c+s*r*l-s*a*c}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=h*a-o*l,d=o*c-h*r,f=l*r-a*c,g=t*u+n*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/g;return e[0]=u*y,e[1]=(s*l-h*n)*y,e[2]=(o*n-s*a)*y,e[3]=d*y,e[4]=(h*t-s*c)*y,e[5]=(s*r-o*t)*y,e[6]=f*y,e[7]=(n*c-l*t)*y,e[8]=(a*t-n*r)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-s*l,s*c,-s*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Bo.makeScale(e,t)),this}rotate(e){return this.premultiply(Bo.makeRotation(-e)),this}translate(e,t){return this.premultiply(Bo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Bo=new Be;Tu={};Ru=new Be().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Cu=new Be().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Bs={[Et]:{transfer:ca,primaries:la,luminanceCoefficients:[.2126,.7152,.0722],toReference:i=>i,fromReference:i=>i},[Ut]:{transfer:ct,primaries:la,luminanceCoefficients:[.2126,.7152,.0722],toReference:i=>i.convertSRGBToLinear(),fromReference:i=>i.convertLinearToSRGB()},[Ya]:{transfer:ca,primaries:ha,luminanceCoefficients:[.2289,.6917,.0793],toReference:i=>i.applyMatrix3(Cu),fromReference:i=>i.applyMatrix3(Ru)},[Bl]:{transfer:ct,primaries:ha,luminanceCoefficients:[.2289,.6917,.0793],toReference:i=>i.convertSRGBToLinear().applyMatrix3(Cu),fromReference:i=>i.applyMatrix3(Ru).convertLinearToSRGB()}},eg=new Set([Et,Ya]),qe={enabled:!0,_workingColorSpace:Et,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(i){if(!eg.has(i))throw new Error(`Unsupported working color space, "${i}".`);this._workingColorSpace=i},convert:function(i,e,t){if(this.enabled===!1||e===t||!e||!t)return i;let n=Bs[e].toReference,s=Bs[t].fromReference;return s(n(i))},fromWorkingColorSpace:function(i,e){return this.convert(i,this._workingColorSpace,e)},toWorkingColorSpace:function(i,e){return this.convert(i,e,this._workingColorSpace)},getPrimaries:function(i){return Bs[i].primaries},getTransfer:function(i){return i===ii?ca:Bs[i].transfer},getLuminanceCoefficients:function(i,e=this._workingColorSpace){return i.fromArray(Bs[e].luminanceCoefficients)}};tl=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Xi===void 0&&(Xi=tr("canvas")),Xi.width=e.width,Xi.height=e.height;let n=Xi.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Xi}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=tr("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=us(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(us(t[n]/255)*255):t[n]=us(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},tg=0,da=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:tg++}),this.uuid=xn(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(Ho(s[a].image)):r.push(Ho(s[a]))}else r=Ho(s);n.url=r}return t||(e.images[this.uuid]=n),n}};ng=0,Lt=class i extends An{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=Bn,s=Bn,r=Xt,a=Sn,o=hn,c=Hn,l=i.DEFAULT_ANISOTROPY,h=ii){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ng++}),this.uuid=xn(),this.name="",this.source=new da(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new Te(0,0),this.repeat=new Te(1,1),this.center=new Te(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Be,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Nd)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Li:e.x=e.x-Math.floor(e.x);break;case Bn:e.x=e.x<0?0:1;break;case Qs:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Li:e.y=e.y-Math.floor(e.y);break;case Bn:e.y=e.y<0?0:1;break;case Qs:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Lt.DEFAULT_IMAGE=null;Lt.DEFAULT_MAPPING=Nd;Lt.DEFAULT_ANISOTROPY=1;Ke=class i{constructor(e=0,t=0,n=0,s=1){i.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,c=e.elements,l=c[0],h=c[4],u=c[8],d=c[1],f=c[5],g=c[9],y=c[2],p=c[6],m=c[10];if(Math.abs(h-d)<.01&&Math.abs(u-y)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+y)<.1&&Math.abs(g+p)<.1&&Math.abs(l+f+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let x=(l+1)/2,b=(f+1)/2,C=(m+1)/2,A=(h+d)/4,E=(u+y)/4,N=(g+p)/4;return x>b&&x>C?x<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(x),s=A/n,r=E/n):b>C?b<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(b),n=A/s,r=N/s):C<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(C),n=E/r,s=N/r),this.set(n,s,r,t),this}let _=Math.sqrt((p-g)*(p-g)+(u-y)*(u-y)+(d-h)*(d-h));return Math.abs(_)<.001&&(_=1),this.x=(p-g)/_,this.y=(u-y)/_,this.z=(d-h)/_,this.w=Math.acos((l+f+m-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},nl=class extends An{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Ke(0,0,e,t),this.scissorTest=!1,this.viewport=new Ke(0,0,e,t);let s={width:e,height:t,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Xt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);let r=new Lt(s,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);r.flipY=!1,r.generateMipmaps=n.generateMipmaps,r.internalFormat=n.internalFormat,this.textures=[];let a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,s=e.textures.length;n<s;n++)this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new da(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},Vn=class extends nl{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},fa=class extends Lt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=kt,this.minFilter=kt,this.wrapR=Bn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},il=class extends Lt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=kt,this.minFilter=kt,this.wrapR=Bn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Pt=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let c=n[s+0],l=n[s+1],h=n[s+2],u=n[s+3],d=r[a+0],f=r[a+1],g=r[a+2],y=r[a+3];if(o===0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(o===1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=y;return}if(u!==y||c!==d||l!==f||h!==g){let p=1-o,m=c*d+l*f+h*g+u*y,_=m>=0?1:-1,x=1-m*m;if(x>Number.EPSILON){let C=Math.sqrt(x),A=Math.atan2(C,m*_);p=Math.sin(p*A)/C,o=Math.sin(o*A)/C}let b=o*_;if(c=c*p+d*b,l=l*p+f*b,h=h*p+g*b,u=u*p+y*b,p===1-o){let C=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=C,l*=C,h*=C,u*=C}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,s,r,a){let o=n[s],c=n[s+1],l=n[s+2],h=n[s+3],u=r[a],d=r[a+1],f=r[a+2],g=r[a+3];return e[t]=o*g+h*u+c*f-l*d,e[t+1]=c*g+h*d+l*u-o*f,e[t+2]=l*g+h*f+o*d-c*u,e[t+3]=h*g-o*u-c*d-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(s/2),u=o(r/2),d=c(n/2),f=c(s/2),g=c(r/2);switch(a){case"XYZ":this._x=d*h*u+l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u+d*f*g;break;case"YZX":this._x=d*h*u+l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u-d*f*g;break;case"XZY":this._x=d*h*u-l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],c=t[9],l=t[2],h=t[6],u=t[10],d=n+o+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(a-s)*f}else if(n>o&&n>u){let f=2*Math.sqrt(1+n-o-u);this._w=(h-c)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+l)/f}else if(o>u){let f=2*Math.sqrt(1+o-n-u);this._w=(r-l)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(c+h)/f}else{let f=2*Math.sqrt(1+u-n-o);this._w=(a-s)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(It(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+a*o+s*l-r*c,this._y=s*h+a*c+r*o-n*l,this._z=r*h+a*l+n*c-s*o,this._w=a*h-n*o-s*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let n=this._x,s=this._y,r=this._z,a=this._w,o=a*e._w+n*e._x+s*e._y+r*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=s,this._z=r,this;let c=1-o*o;if(c<=Number.EPSILON){let f=1-t;return this._w=f*a+t*this._w,this._x=f*n+t*this._x,this._y=f*s+t*this._y,this._z=f*r+t*this._z,this.normalize(),this}let l=Math.sqrt(c),h=Math.atan2(l,o),u=Math.sin((1-t)*h)/l,d=Math.sin(t*h)/l;return this._w=a*u+this._w*d,this._x=n*u+this._x*d,this._y=s*u+this._y*d,this._z=r*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},O=class i{constructor(e=0,t=0,n=0){i.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Iu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Iu.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*s-o*n),h=2*(o*t-r*s),u=2*(r*n-a*t);return this.x=t+c*l+a*u-o*h,this.y=n+c*h+o*l-r*u,this.z=s+c*u+r*h-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,c=t.z;return this.x=s*c-r*o,this.y=r*a-n*c,this.z=n*o-s*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Vo.copy(this).projectOnVector(e),this.sub(Vo)}reflect(e){return this.sub(Vo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(It(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Vo=new O,Iu=new Pt,Yt=class{constructor(e=new O(1/0,1/0,1/0),t=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(pn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(pn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=pn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,pn):pn.fromBufferAttribute(r,a),pn.applyMatrix4(e.matrixWorld),this.expandByPoint(pn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Rr.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Rr.copy(n.boundingBox)),Rr.applyMatrix4(e.matrixWorld),this.union(Rr)}let s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,pn),pn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(zs),Cr.subVectors(this.max,zs),qi.subVectors(e.a,zs),Yi.subVectors(e.b,zs),$i.subVectors(e.c,zs),Zn.subVectors(Yi,qi),Jn.subVectors($i,Yi),Mi.subVectors(qi,$i);let t=[0,-Zn.z,Zn.y,0,-Jn.z,Jn.y,0,-Mi.z,Mi.y,Zn.z,0,-Zn.x,Jn.z,0,-Jn.x,Mi.z,0,-Mi.x,-Zn.y,Zn.x,0,-Jn.y,Jn.x,0,-Mi.y,Mi.x,0];return!Go(t,qi,Yi,$i,Cr)||(t=[1,0,0,0,1,0,0,0,1],!Go(t,qi,Yi,$i,Cr))?!1:(Ir.crossVectors(Zn,Jn),t=[Ir.x,Ir.y,Ir.z],Go(t,qi,Yi,$i,Cr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,pn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(pn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ln[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ln[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ln[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ln[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ln[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ln[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ln[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ln[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ln),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},Ln=[new O,new O,new O,new O,new O,new O,new O,new O],pn=new O,Rr=new Yt,qi=new O,Yi=new O,$i=new O,Zn=new O,Jn=new O,Mi=new O,zs=new O,Cr=new O,Ir=new O,wi=new O;ig=new Yt,Hs=new O,Wo=new O,rn=class{constructor(e=new O,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):ig.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Hs.subVectors(e,this.center);let t=Hs.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(Hs,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Wo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Hs.copy(e.center).add(Wo)),this.expandByPoint(Hs.copy(e.center).sub(Wo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Nn=new O,Xo=new O,Pr=new O,Qn=new O,qo=new O,Lr=new O,Yo=new O,oi=class{constructor(e=new O,t=new O(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Nn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Nn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Nn.copy(this.origin).addScaledVector(this.direction,t),Nn.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){Xo.copy(e).add(t).multiplyScalar(.5),Pr.copy(t).sub(e).normalize(),Qn.copy(this.origin).sub(Xo);let r=e.distanceTo(t)*.5,a=-this.direction.dot(Pr),o=Qn.dot(this.direction),c=-Qn.dot(Pr),l=Qn.lengthSq(),h=Math.abs(1-a*a),u,d,f,g;if(h>0)if(u=a*c-o,d=a*o-c,g=r*h,u>=0)if(d>=-g)if(d<=g){let y=1/h;u*=y,d*=y,f=u*(u+a*d+2*o)+d*(a*u+d+2*c)+l}else d=r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*c)+l;else d=-r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*c)+l;else d<=-g?(u=Math.max(0,-(-a*r+o)),d=u>0?-r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l):d<=g?(u=0,d=Math.min(Math.max(-r,-c),r),f=d*(d+2*c)+l):(u=Math.max(0,-(a*r+o)),d=u>0?r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l);else d=a>0?-r:r,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(Xo).addScaledVector(Pr,d),f}intersectSphere(e,t){Nn.subVectors(e.center,this.origin);let n=Nn.dot(this.direction),s=Nn.dot(Nn)-n*n,r=e.radius*e.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return l>=0?(n=(e.min.x-d.x)*l,s=(e.max.x-d.x)*l):(n=(e.max.x-d.x)*l,s=(e.min.x-d.x)*l),h>=0?(r=(e.min.y-d.y)*h,a=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,a=(e.min.y-d.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),u>=0?(o=(e.min.z-d.z)*u,c=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,c=(e.min.z-d.z)*u),n>c||o>s)||((o>n||n!==n)&&(n=o),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,Nn)!==null}intersectTriangle(e,t,n,s,r){qo.subVectors(t,e),Lr.subVectors(n,e),Yo.crossVectors(qo,Lr);let a=this.direction.dot(Yo),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Qn.subVectors(this.origin,e);let c=o*this.direction.dot(Lr.crossVectors(Qn,Lr));if(c<0)return null;let l=o*this.direction.dot(qo.cross(Qn));if(l<0||c+l>a)return null;let h=-o*Qn.dot(Yo);return h<0?null:this.at(h/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Oe=class i{constructor(e,t,n,s,r,a,o,c,l,h,u,d,f,g,y,p){i.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l,h,u,d,f,g,y,p)}set(e,t,n,s,r,a,o,c,l,h,u,d,f,g,y,p){let m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=s,m[1]=r,m[5]=a,m[9]=o,m[13]=c,m[2]=l,m[6]=h,m[10]=u,m[14]=d,m[3]=f,m[7]=g,m[11]=y,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new i().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,s=1/ji.setFromMatrixColumn(e,0).length(),r=1/ji.setFromMatrixColumn(e,1).length(),a=1/ji.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){let d=a*h,f=a*u,g=o*h,y=o*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=f+g*l,t[5]=d-y*l,t[9]=-o*c,t[2]=y-d*l,t[6]=g+f*l,t[10]=a*c}else if(e.order==="YXZ"){let d=c*h,f=c*u,g=l*h,y=l*u;t[0]=d+y*o,t[4]=g*o-f,t[8]=a*l,t[1]=a*u,t[5]=a*h,t[9]=-o,t[2]=f*o-g,t[6]=y+d*o,t[10]=a*c}else if(e.order==="ZXY"){let d=c*h,f=c*u,g=l*h,y=l*u;t[0]=d-y*o,t[4]=-a*u,t[8]=g+f*o,t[1]=f+g*o,t[5]=a*h,t[9]=y-d*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){let d=a*h,f=a*u,g=o*h,y=o*u;t[0]=c*h,t[4]=g*l-f,t[8]=d*l+y,t[1]=c*u,t[5]=y*l+d,t[9]=f*l-g,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){let d=a*c,f=a*l,g=o*c,y=o*l;t[0]=c*h,t[4]=y-d*u,t[8]=g*u+f,t[1]=u,t[5]=a*h,t[9]=-o*h,t[2]=-l*h,t[6]=f*u+g,t[10]=d-y*u}else if(e.order==="XZY"){let d=a*c,f=a*l,g=o*c,y=o*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=d*u+y,t[5]=a*h,t[9]=f*u-g,t[2]=g*u-f,t[6]=o*h,t[10]=y*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(sg,e,rg)}lookAt(e,t,n){let s=this.elements;return tn.subVectors(e,t),tn.lengthSq()===0&&(tn.z=1),tn.normalize(),ei.crossVectors(n,tn),ei.lengthSq()===0&&(Math.abs(n.z)===1?tn.x+=1e-4:tn.z+=1e-4,tn.normalize(),ei.crossVectors(n,tn)),ei.normalize(),Nr.crossVectors(tn,ei),s[0]=ei.x,s[4]=Nr.x,s[8]=tn.x,s[1]=ei.y,s[5]=Nr.y,s[9]=tn.y,s[2]=ei.z,s[6]=Nr.z,s[10]=tn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],u=n[5],d=n[9],f=n[13],g=n[2],y=n[6],p=n[10],m=n[14],_=n[3],x=n[7],b=n[11],C=n[15],A=s[0],E=s[4],N=s[8],j=s[12],v=s[1],M=s[5],L=s[9],U=s[13],I=s[2],R=s[6],P=s[10],$=s[14],V=s[3],k=s[7],Y=s[11],se=s[15];return r[0]=a*A+o*v+c*I+l*V,r[4]=a*E+o*M+c*R+l*k,r[8]=a*N+o*L+c*P+l*Y,r[12]=a*j+o*U+c*$+l*se,r[1]=h*A+u*v+d*I+f*V,r[5]=h*E+u*M+d*R+f*k,r[9]=h*N+u*L+d*P+f*Y,r[13]=h*j+u*U+d*$+f*se,r[2]=g*A+y*v+p*I+m*V,r[6]=g*E+y*M+p*R+m*k,r[10]=g*N+y*L+p*P+m*Y,r[14]=g*j+y*U+p*$+m*se,r[3]=_*A+x*v+b*I+C*V,r[7]=_*E+x*M+b*R+C*k,r[11]=_*N+x*L+b*P+C*Y,r[15]=_*j+x*U+b*$+C*se,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],c=e[9],l=e[13],h=e[2],u=e[6],d=e[10],f=e[14],g=e[3],y=e[7],p=e[11],m=e[15];return g*(+r*c*u-s*l*u-r*o*d+n*l*d+s*o*f-n*c*f)+y*(+t*c*f-t*l*d+r*a*d-s*a*f+s*l*h-r*c*h)+p*(+t*l*u-t*o*f-r*a*u+n*a*f+r*o*h-n*l*h)+m*(-s*o*h-t*c*u+t*o*d+s*a*u-n*a*d+n*c*h)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],u=e[9],d=e[10],f=e[11],g=e[12],y=e[13],p=e[14],m=e[15],_=u*p*l-y*d*l+y*c*f-o*p*f-u*c*m+o*d*m,x=g*d*l-h*p*l-g*c*f+a*p*f+h*c*m-a*d*m,b=h*y*l-g*u*l+g*o*f-a*y*f-h*o*m+a*u*m,C=g*u*c-h*y*c-g*o*d+a*y*d+h*o*p-a*u*p,A=t*_+n*x+s*b+r*C;if(A===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let E=1/A;return e[0]=_*E,e[1]=(y*d*r-u*p*r-y*s*f+n*p*f+u*s*m-n*d*m)*E,e[2]=(o*p*r-y*c*r+y*s*l-n*p*l-o*s*m+n*c*m)*E,e[3]=(u*c*r-o*d*r-u*s*l+n*d*l+o*s*f-n*c*f)*E,e[4]=x*E,e[5]=(h*p*r-g*d*r+g*s*f-t*p*f-h*s*m+t*d*m)*E,e[6]=(g*c*r-a*p*r-g*s*l+t*p*l+a*s*m-t*c*m)*E,e[7]=(a*d*r-h*c*r+h*s*l-t*d*l-a*s*f+t*c*f)*E,e[8]=b*E,e[9]=(g*u*r-h*y*r-g*n*f+t*y*f+h*n*m-t*u*m)*E,e[10]=(a*y*r-g*o*r+g*n*l-t*y*l-a*n*m+t*o*m)*E,e[11]=(h*o*r-a*u*r-h*n*l+t*u*l+a*n*f-t*o*f)*E,e[12]=C*E,e[13]=(h*y*s-g*u*s+g*n*d-t*y*d-h*n*p+t*u*p)*E,e[14]=(g*o*s-a*y*s-g*n*c+t*y*c+a*n*p-t*o*p)*E,e[15]=(a*u*s-h*o*s+h*n*c-t*u*c-a*n*d+t*o*d)*E,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,c=e.z,l=r*a,h=r*o;return this.set(l*a+n,l*o-s*c,l*c+s*o,0,l*o+s*c,h*o+n,h*c-s*a,0,l*c-s*o,h*c+s*a,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,a=t._y,o=t._z,c=t._w,l=r+r,h=a+a,u=o+o,d=r*l,f=r*h,g=r*u,y=a*h,p=a*u,m=o*u,_=c*l,x=c*h,b=c*u,C=n.x,A=n.y,E=n.z;return s[0]=(1-(y+m))*C,s[1]=(f+b)*C,s[2]=(g-x)*C,s[3]=0,s[4]=(f-b)*A,s[5]=(1-(d+m))*A,s[6]=(p+_)*A,s[7]=0,s[8]=(g+x)*E,s[9]=(p-_)*E,s[10]=(1-(d+y))*E,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements,r=ji.set(s[0],s[1],s[2]).length(),a=ji.set(s[4],s[5],s[6]).length(),o=ji.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],mn.copy(this);let l=1/r,h=1/a,u=1/o;return mn.elements[0]*=l,mn.elements[1]*=l,mn.elements[2]*=l,mn.elements[4]*=h,mn.elements[5]*=h,mn.elements[6]*=h,mn.elements[8]*=u,mn.elements[9]*=u,mn.elements[10]*=u,t.setFromRotationMatrix(mn),n.x=r,n.y=a,n.z=o,this}makePerspective(e,t,n,s,r,a,o=zn){let c=this.elements,l=2*r/(t-e),h=2*r/(n-s),u=(t+e)/(t-e),d=(n+s)/(n-s),f,g;if(o===zn)f=-(a+r)/(a-r),g=-2*a*r/(a-r);else if(o===ua)f=-a/(a-r),g=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=l,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=h,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=zn){let c=this.elements,l=1/(t-e),h=1/(n-s),u=1/(a-r),d=(t+e)*l,f=(n+s)*h,g,y;if(o===zn)g=(a+r)*u,y=-2*u;else if(o===ua)g=r*u,y=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-d,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=y,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},ji=new O,mn=new Oe,sg=new O(0,0,0),rg=new O(1,1,1),ei=new O,Nr=new O,tn=new O,Pu=new Oe,Lu=new Pt,Tn=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],a=s[4],o=s[8],c=s[1],l=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(It(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-It(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(It(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-It(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(It(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-It(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Pu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Pu,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Lu.setFromEuler(this),this.setFromQuaternion(Lu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Tn.DEFAULT_ORDER="XYZ";pa=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},ag=0,Nu=new O,Ki=new Pt,Dn=new Oe,Dr=new O,Vs=new O,og=new O,cg=new Pt,Du=new O(1,0,0),Uu=new O(0,1,0),ku=new O(0,0,1),Ou={type:"added"},lg={type:"removed"},Zi={type:"childadded",child:null},$o={type:"childremoved",child:null},ut=class i extends An{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:ag++}),this.uuid=xn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new O,t=new Tn,n=new Pt,s=new O(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Oe},normalMatrix:{value:new Be}}),this.matrix=new Oe,this.matrixWorld=new Oe,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new pa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ki.setFromAxisAngle(e,t),this.quaternion.multiply(Ki),this}rotateOnWorldAxis(e,t){return Ki.setFromAxisAngle(e,t),this.quaternion.premultiply(Ki),this}rotateX(e){return this.rotateOnAxis(Du,e)}rotateY(e){return this.rotateOnAxis(Uu,e)}rotateZ(e){return this.rotateOnAxis(ku,e)}translateOnAxis(e,t){return Nu.copy(e).applyQuaternion(this.quaternion),this.position.add(Nu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Du,e)}translateY(e){return this.translateOnAxis(Uu,e)}translateZ(e){return this.translateOnAxis(ku,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Dn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Dr.copy(e):Dr.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Vs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Dn.lookAt(Vs,Dr,this.up):Dn.lookAt(Dr,Vs,this.up),this.quaternion.setFromRotationMatrix(Dn),s&&(Dn.extractRotation(s.matrixWorld),Ki.setFromRotationMatrix(Dn),this.quaternion.premultiply(Ki.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Ou),Zi.child=e,this.dispatchEvent(Zi),Zi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(lg),$o.child=e,this.dispatchEvent($o),$o.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Dn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Dn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Dn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Ou),Zi.child=e,this.dispatchEvent(Zi),Zi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Vs,e,og),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Vs,cg,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(e.materials,this.material[c]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];s.animations.push(r(e.animations,c))}}if(t){let o=a(e.geometries),c=a(e.materials),l=a(e.textures),h=a(e.images),u=a(e.shapes),d=a(e.skeletons),f=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),u.length>0&&(n.shapes=u),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=s,n;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};ut.DEFAULT_UP=new O(0,1,0);ut.DEFAULT_MATRIX_AUTO_UPDATE=!0;ut.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;gn=new O,Un=new O,jo=new O,kn=new O,Ji=new O,Qi=new O,Fu=new O,Ko=new O,Zo=new O,Jo=new O,Qo=new Ke,ec=new Ke,tc=new Ke,Ii=class i{constructor(e=new O,t=new O,n=new O){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),gn.subVectors(e,t),s.cross(gn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){gn.subVectors(s,t),Un.subVectors(n,t),jo.subVectors(e,t);let a=gn.dot(gn),o=gn.dot(Un),c=gn.dot(jo),l=Un.dot(Un),h=Un.dot(jo),u=a*l-o*o;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(l*c-o*h)*d,g=(a*h-o*c)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,kn)===null?!1:kn.x>=0&&kn.y>=0&&kn.x+kn.y<=1}static getInterpolation(e,t,n,s,r,a,o,c){return this.getBarycoord(e,t,n,s,kn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,kn.x),c.addScaledVector(a,kn.y),c.addScaledVector(o,kn.z),c)}static getInterpolatedAttribute(e,t,n,s,r,a){return Qo.setScalar(0),ec.setScalar(0),tc.setScalar(0),Qo.fromBufferAttribute(e,t),ec.fromBufferAttribute(e,n),tc.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(Qo,r.x),a.addScaledVector(ec,r.y),a.addScaledVector(tc,r.z),a}static isFrontFacing(e,t,n,s){return gn.subVectors(n,t),Un.subVectors(e,t),gn.cross(Un).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return gn.subVectors(this.c,this.b),Un.subVectors(this.a,this.b),gn.cross(Un).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,a,o;Ji.subVectors(s,n),Qi.subVectors(r,n),Ko.subVectors(e,n);let c=Ji.dot(Ko),l=Qi.dot(Ko);if(c<=0&&l<=0)return t.copy(n);Zo.subVectors(e,s);let h=Ji.dot(Zo),u=Qi.dot(Zo);if(h>=0&&u<=h)return t.copy(s);let d=c*u-h*l;if(d<=0&&c>=0&&h<=0)return a=c/(c-h),t.copy(n).addScaledVector(Ji,a);Jo.subVectors(e,r);let f=Ji.dot(Jo),g=Qi.dot(Jo);if(g>=0&&f<=g)return t.copy(r);let y=f*l-c*g;if(y<=0&&l>=0&&g<=0)return o=l/(l-g),t.copy(n).addScaledVector(Qi,o);let p=h*g-f*u;if(p<=0&&u-h>=0&&f-g>=0)return Fu.subVectors(r,s),o=(u-h)/(u-h+(f-g)),t.copy(s).addScaledVector(Fu,o);let m=1/(p+y+d);return a=y*m,o=d*m,t.copy(n).addScaledVector(Ji,a).addScaledVector(Qi,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Yd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ti={h:0,s:0,l:0},Ur={h:0,s:0,l:0};Ie=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ut){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,qe.toWorkingColorSpace(this,t),this}setRGB(e,t,n,s=qe.workingColorSpace){return this.r=e,this.g=t,this.b=n,qe.toWorkingColorSpace(this,s),this}setHSL(e,t,n,s=qe.workingColorSpace){if(e=zl(e,1),t=It(t,0,1),n=It(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=nc(a,r,e+1/3),this.g=nc(a,r,e),this.b=nc(a,r,e-1/3)}return qe.toWorkingColorSpace(this,s),this}setStyle(e,t=Ut){function n(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ut){let n=Yd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=us(e.r),this.g=us(e.g),this.b=us(e.b),this}copyLinearToSRGB(e){return this.r=zo(e.r),this.g=zo(e.g),this.b=zo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ut){return qe.fromWorkingColorSpace(Dt.copy(this),e),Math.round(It(Dt.r*255,0,255))*65536+Math.round(It(Dt.g*255,0,255))*256+Math.round(It(Dt.b*255,0,255))}getHexString(e=Ut){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=qe.workingColorSpace){qe.fromWorkingColorSpace(Dt.copy(this),t);let n=Dt.r,s=Dt.g,r=Dt.b,a=Math.max(n,s,r),o=Math.min(n,s,r),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let u=a-o;switch(l=h<=.5?u/(a+o):u/(2-a-o),a){case n:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-n)/u+2;break;case r:c=(n-s)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=qe.workingColorSpace){return qe.fromWorkingColorSpace(Dt.copy(this),t),e.r=Dt.r,e.g=Dt.g,e.b=Dt.b,e}getStyle(e=Ut){qe.fromWorkingColorSpace(Dt.copy(this),e);let t=Dt.r,n=Dt.g,s=Dt.b;return e!==Ut?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(ti),this.setHSL(ti.h+e,ti.s+t,ti.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(ti),e.getHSL(Ur);let n=Zs(ti.h,Ur.h,t),s=Zs(ti.s,Ur.s,t),r=Zs(ti.l,Ur.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Dt=new Ie;Ie.NAMES=Yd;hg=0,an=class extends An{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:hg++}),this.uuid=xn(),this.name="",this.type="Material",this.blending=ls,this.side=En,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=yc,this.blendDst=_c,this.blendEquation=Ci,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ie(0,0,0),this.blendAlpha=0,this.depthFunc=fs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Su,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Wi,this.stencilZFail=Wi,this.stencilZPass=Wi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ls&&(n.blending=this.blending),this.side!==En&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==yc&&(n.blendSrc=this.blendSrc),this.blendDst!==_c&&(n.blendDst=this.blendDst),this.blendEquation!==Ci&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==fs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Su&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Wi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Wi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Wi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let c=r[o];delete c.metadata,a.push(c)}return a}if(t){let r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}},$t=class extends an{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ie(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Tn,this.combine=Ld,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},mt=new O,kr=new Te,vt=class{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=el,this.updateRanges=[],this.gpuType=vn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)kr.fromBufferAttribute(this,t),kr.applyMatrix3(e),this.setXY(t,kr.x,kr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.applyMatrix3(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.applyMatrix4(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.applyNormalMatrix(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)mt.fromBufferAttribute(this,t),mt.transformDirection(e),this.setXYZ(t,mt.x,mt.y,mt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=_n(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=_n(t,this.array)),t}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=_n(t,this.array)),t}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=_n(t,this.array)),t}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=_n(t,this.array)),t}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==el&&(e.usage=this.usage),e}},ma=class extends vt{constructor(e,t,n){super(new Uint16Array(e),t,n)}},ga=class extends vt{constructor(e,t,n){super(new Uint32Array(e),t,n)}},ft=class extends vt{constructor(e,t,n){super(new Float32Array(e),t,n)}},ug=0,ln=new Oe,ic=new ut,es=new O,nn=new Yt,Gs=new Yt,St=new O,zt=class i extends An{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:ug++}),this.uuid=xn(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(qd(e)?ga:ma)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Be().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return ln.makeRotationFromQuaternion(e),this.applyMatrix4(ln),this}rotateX(e){return ln.makeRotationX(e),this.applyMatrix4(ln),this}rotateY(e){return ln.makeRotationY(e),this.applyMatrix4(ln),this}rotateZ(e){return ln.makeRotationZ(e),this.applyMatrix4(ln),this}translate(e,t,n){return ln.makeTranslation(e,t,n),this.applyMatrix4(ln),this}scale(e,t,n){return ln.makeScale(e,t,n),this.applyMatrix4(ln),this}lookAt(e){return ic.lookAt(e),ic.updateMatrix(),this.applyMatrix4(ic.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(es).negate(),this.translate(es.x,es.y,es.z),this}setFromPoints(e){let t=[];for(let n=0,s=e.length;n<s;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}return this.setAttribute("position",new ft(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Yt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];nn.setFromBufferAttribute(r),this.morphTargetsRelative?(St.addVectors(this.boundingBox.min,nn.min),this.boundingBox.expandByPoint(St),St.addVectors(this.boundingBox.max,nn.max),this.boundingBox.expandByPoint(St)):(this.boundingBox.expandByPoint(nn.min),this.boundingBox.expandByPoint(nn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new rn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(e){let n=this.boundingSphere.center;if(nn.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){let o=t[r];Gs.setFromBufferAttribute(o),this.morphTargetsRelative?(St.addVectors(nn.min,Gs.min),nn.expandByPoint(St),St.addVectors(nn.max,Gs.max),nn.expandByPoint(St)):(nn.expandByPoint(Gs.min),nn.expandByPoint(Gs.max))}nn.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)St.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(St));if(t)for(let r=0,a=t.length;r<a;r++){let o=t[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)St.fromBufferAttribute(o,l),c&&(es.fromBufferAttribute(e,l),St.add(es)),s=Math.max(s,n.distanceToSquared(St))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new vt(new Float32Array(4*n.count),4));let a=this.getAttribute("tangent"),o=[],c=[];for(let N=0;N<n.count;N++)o[N]=new O,c[N]=new O;let l=new O,h=new O,u=new O,d=new Te,f=new Te,g=new Te,y=new O,p=new O;function m(N,j,v){l.fromBufferAttribute(n,N),h.fromBufferAttribute(n,j),u.fromBufferAttribute(n,v),d.fromBufferAttribute(r,N),f.fromBufferAttribute(r,j),g.fromBufferAttribute(r,v),h.sub(l),u.sub(l),f.sub(d),g.sub(d);let M=1/(f.x*g.y-g.x*f.y);isFinite(M)&&(y.copy(h).multiplyScalar(g.y).addScaledVector(u,-f.y).multiplyScalar(M),p.copy(u).multiplyScalar(f.x).addScaledVector(h,-g.x).multiplyScalar(M),o[N].add(y),o[j].add(y),o[v].add(y),c[N].add(p),c[j].add(p),c[v].add(p))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let N=0,j=_.length;N<j;++N){let v=_[N],M=v.start,L=v.count;for(let U=M,I=M+L;U<I;U+=3)m(e.getX(U+0),e.getX(U+1),e.getX(U+2))}let x=new O,b=new O,C=new O,A=new O;function E(N){C.fromBufferAttribute(s,N),A.copy(C);let j=o[N];x.copy(j),x.sub(C.multiplyScalar(C.dot(j))).normalize(),b.crossVectors(A,j);let M=b.dot(c[N])<0?-1:1;a.setXYZW(N,x.x,x.y,x.z,M)}for(let N=0,j=_.length;N<j;++N){let v=_[N],M=v.start,L=v.count;for(let U=M,I=M+L;U<I;U+=3)E(e.getX(U+0)),E(e.getX(U+1)),E(e.getX(U+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new vt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);let s=new O,r=new O,a=new O,o=new O,c=new O,l=new O,h=new O,u=new O;if(e)for(let d=0,f=e.count;d<f;d+=3){let g=e.getX(d+0),y=e.getX(d+1),p=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,y),a.fromBufferAttribute(t,p),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),o.fromBufferAttribute(n,g),c.fromBufferAttribute(n,y),l.fromBufferAttribute(n,p),o.add(h),c.add(h),l.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(y,c.x,c.y,c.z),n.setXYZ(p,l.x,l.y,l.z)}else for(let d=0,f=t.count;d<f;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),h.subVectors(a,r),u.subVectors(s,r),h.cross(u),n.setXYZ(d+0,h.x,h.y,h.z),n.setXYZ(d+1,h.x,h.y,h.z),n.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)St.fromBufferAttribute(e,t),St.normalize(),e.setXYZ(t,St.x,St.y,St.z)}toNonIndexed(){function e(o,c){let l=o.array,h=o.itemSize,u=o.normalized,d=new l.constructor(c.length*h),f=0,g=0;for(let y=0,p=c.length;y<p;y++){o.isInterleavedBufferAttribute?f=c[y]*o.data.stride+o.offset:f=c[y]*h;for(let m=0;m<h;m++)d[g++]=l[f++]}return new vt(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let o in s){let c=s[o],l=e(c,n);t.setAttribute(o,l)}let r=this.morphAttributes;for(let o in r){let c=[],l=r[o];for(let h=0,u=l.length;h<u;h++){let d=l[h],f=e(d,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let c in n){let l=n[c];e.data.attributes[c]=l.toJSON(e.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,d=l.length;u<d;u++){let f=l[u];h.push(f.toJSON(e.data))}h.length>0&&(s[c]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone(t));let s=e.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(t))}let r=e.morphAttributes;for(let l in r){let h=[],u=r[l];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let l=0,h=a.length;l<h;l++){let u=a[l];this.addGroup(u.start,u.count,u.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},Bu=new Oe,Si=new oi,Or=new rn,zu=new O,Fr=new O,Br=new O,zr=new O,sc=new O,Hr=new O,Hu=new O,Vr=new O,gt=class extends ut{constructor(e=new zt,t=new $t){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let o=this.morphTargetInfluences;if(r&&o){Hr.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=o[c],u=r[c];h!==0&&(sc.fromBufferAttribute(u,e),a?Hr.addScaledVector(sc,h):Hr.addScaledVector(sc.sub(t),h))}t.add(Hr)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Or.copy(n.boundingSphere),Or.applyMatrix4(r),Si.copy(e.ray).recast(e.near),!(Or.containsPoint(Si.origin)===!1&&(Si.intersectSphere(Or,zu)===null||Si.origin.distanceToSquared(zu)>(e.far-e.near)**2))&&(Bu.copy(r).invert(),Si.copy(e.ray).applyMatrix4(Bu),!(n.boundingBox!==null&&Si.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Si)))}_computeIntersections(e,t,n){let s,r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,y=d.length;g<y;g++){let p=d[g],m=a[p.materialIndex],_=Math.max(p.start,f.start),x=Math.min(o.count,Math.min(p.start+p.count,f.start+f.count));for(let b=_,C=x;b<C;b+=3){let A=o.getX(b),E=o.getX(b+1),N=o.getX(b+2);s=Gr(this,m,e,n,l,h,u,A,E,N),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),y=Math.min(o.count,f.start+f.count);for(let p=g,m=y;p<m;p+=3){let _=o.getX(p),x=o.getX(p+1),b=o.getX(p+2);s=Gr(this,a,e,n,l,h,u,_,x,b),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(a))for(let g=0,y=d.length;g<y;g++){let p=d[g],m=a[p.materialIndex],_=Math.max(p.start,f.start),x=Math.min(c.count,Math.min(p.start+p.count,f.start+f.count));for(let b=_,C=x;b<C;b+=3){let A=b,E=b+1,N=b+2;s=Gr(this,m,e,n,l,h,u,A,E,N),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),y=Math.min(c.count,f.start+f.count);for(let p=g,m=y;p<m;p+=3){let _=p,x=p+1,b=p+2;s=Gr(this,a,e,n,l,h,u,_,x,b),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}}};nr=class i extends zt{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let c=[],l=[],h=[],u=[],d=0,f=0;g("z","y","x",-1,-1,n,t,e,a,r,0),g("z","y","x",1,-1,n,t,-e,a,r,1),g("x","z","y",1,1,e,n,t,s,a,2),g("x","z","y",1,-1,e,n,-t,s,a,3),g("x","y","z",1,-1,e,t,n,s,r,4),g("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new ft(l,3)),this.setAttribute("normal",new ft(h,3)),this.setAttribute("uv",new ft(u,2));function g(y,p,m,_,x,b,C,A,E,N,j){let v=b/E,M=C/N,L=b/2,U=C/2,I=A/2,R=E+1,P=N+1,$=0,V=0,k=new O;for(let Y=0;Y<P;Y++){let se=Y*M-U;for(let Se=0;Se<R;Se++){let Ve=Se*v-L;k[y]=Ve*_,k[p]=se*x,k[m]=I,l.push(k.x,k.y,k.z),k[y]=0,k[p]=0,k[m]=A>0?1:-1,h.push(k.x,k.y,k.z),u.push(Se/E),u.push(1-Y/N),$+=1}}for(let Y=0;Y<N;Y++)for(let se=0;se<E;se++){let Se=d+se+R*Y,Ve=d+se+R*(Y+1),Z=d+(se+1)+R*(Y+1),ie=d+(se+1)+R*Y;c.push(Se,Ve,ie),c.push(Ve,Z,ie),V+=6}o.addGroup(f,V,j),f+=V,d+=$}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};pg={clone:bs,merge:Ft},mg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,gg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Rn=class extends an{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=mg,this.fragmentShader=gg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=bs(e.uniforms),this.uniformsGroups=fg(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},ya=class extends ut{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Oe,this.projectionMatrix=new Oe,this.projectionMatrixInverse=new Oe,this.coordinateSystem=zn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},ni=new O,Vu=new Te,Gu=new Te,_t=class extends ya{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=xs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ks*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return xs*2*Math.atan(Math.tan(Ks*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ni.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ni.x,ni.y).multiplyScalar(-e/ni.z),ni.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ni.x,ni.y).multiplyScalar(-e/ni.z)}getViewSize(e,t){return this.getViewBounds(e,Vu,Gu),t.subVectors(Gu,Vu)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Ks*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*s/c,t-=a.offsetY*n/l,s*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},ts=-90,ns=1,sl=class extends ut{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new _t(ts,ns,e,t);s.layers=this.layers,this.add(s);let r=new _t(ts,ns,e,t);r.layers=this.layers,this.add(r);let a=new _t(ts,ns,e,t);a.layers=this.layers,this.add(a);let o=new _t(ts,ns,e,t);o.layers=this.layers,this.add(o);let c=new _t(ts,ns,e,t);c.layers=this.layers,this.add(c);let l=new _t(ts,ns,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,c]=t;for(let l of t)this.remove(l);if(e===zn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===ua)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,c,l,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let y=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,s),e.render(t,r),e.setRenderTarget(n,1,s),e.render(t,a),e.setRenderTarget(n,2,s),e.render(t,o),e.setRenderTarget(n,3,s),e.render(t,c),e.setRenderTarget(n,4,s),e.render(t,l),n.texture.generateMipmaps=y,e.setRenderTarget(n,5,s),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}},_a=class extends Lt{constructor(e,t,n,s,r,a,o,c,l,h){e=e!==void 0?e:[],t=t!==void 0?t:ps,super(e,t,n,s,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},rl=class extends Vn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new _a(s,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Xt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new nr(5,5,5),r=new Rn({name:"CubemapFromEquirect",uniforms:bs(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:qt,blending:ri});r.uniforms.tEquirect.value=t;let a=new gt(s,r),o=t.minFilter;return t.minFilter===Sn&&(t.minFilter=Xt),new sl(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,s){let r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}},rc=new O,yg=new O,_g=new Be,yn=class{constructor(e=new O(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=rc.subVectors(n,t).cross(yg.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(rc),s=this.normal.dot(n);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(n,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||_g.getNormalMatrix(e),s=this.coplanarPoint(rc).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ei=new rn,Wr=new O,ir=class{constructor(e=new yn,t=new yn,n=new yn,s=new yn,r=new yn,a=new yn){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=zn){let n=this.planes,s=e.elements,r=s[0],a=s[1],o=s[2],c=s[3],l=s[4],h=s[5],u=s[6],d=s[7],f=s[8],g=s[9],y=s[10],p=s[11],m=s[12],_=s[13],x=s[14],b=s[15];if(n[0].setComponents(c-r,d-l,p-f,b-m).normalize(),n[1].setComponents(c+r,d+l,p+f,b+m).normalize(),n[2].setComponents(c+a,d+h,p+g,b+_).normalize(),n[3].setComponents(c-a,d-h,p-g,b-_).normalize(),n[4].setComponents(c-o,d-u,p-y,b-x).normalize(),t===zn)n[5].setComponents(c+o,d+u,p+y,b+x).normalize();else if(t===ua)n[5].setComponents(o,u,y,x).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ei.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ei.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ei)}intersectsSprite(e){return Ei.center.set(0,0,0),Ei.radius=.7071067811865476,Ei.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ei)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(Wr.x=s.normal.x>0?e.max.x:e.min.x,Wr.y=s.normal.y>0?e.max.y:e.min.y,Wr.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Wr)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};va=class i extends zt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,a=t/2,o=Math.floor(n),c=Math.floor(s),l=o+1,h=c+1,u=e/o,d=t/c,f=[],g=[],y=[],p=[];for(let m=0;m<h;m++){let _=m*d-a;for(let x=0;x<l;x++){let b=x*u-r;g.push(b,-_,0),y.push(0,0,1),p.push(x/o),p.push(1-m/c)}}for(let m=0;m<c;m++)for(let _=0;_<o;_++){let x=_+l*m,b=_+l*(m+1),C=_+1+l*(m+1),A=_+1+l*m;f.push(x,b,A),f.push(b,C,A)}this.setIndex(f),this.setAttribute("position",new ft(g,3)),this.setAttribute("normal",new ft(y,3)),this.setAttribute("uv",new ft(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},xg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,bg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Mg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,wg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Sg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Eg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Ag=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Tg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Rg=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Cg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Ig=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Pg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Lg=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Ng=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Dg=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Ug=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,kg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Og=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Fg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Bg=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,zg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Hg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Vg=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Gg=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Wg=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Xg=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,qg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Yg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,$g=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,jg=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Kg="gl_FragColor = linearToOutputTexel( gl_FragColor );",Zg=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Jg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Qg=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,e0=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,t0=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,n0=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,i0=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,s0=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,r0=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,a0=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,o0=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,c0=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,l0=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,h0=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,u0=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,d0=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,f0=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,p0=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,m0=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,g0=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,y0=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,_0=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,v0=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,x0=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,b0=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,M0=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,w0=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,S0=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,E0=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,A0=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,T0=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,R0=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,C0=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,I0=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,P0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,L0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,N0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,D0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,U0=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,k0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,O0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,F0=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,B0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,z0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,H0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,V0=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,G0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,W0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,X0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,q0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Y0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,$0=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,j0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,K0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Z0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,J0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Q0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,ey=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ty=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,ny=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,iy=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,sy=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,ry=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ay=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,oy=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,cy=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ly=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,hy=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,uy=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,dy=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,fy=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,py=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,my=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,gy=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,yy=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,_y=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,vy=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,xy=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,by=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,My=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,wy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Sy=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ey=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Ay=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,Ty=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Ry=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Cy=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Iy=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Py=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ly=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ny=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Dy=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Uy=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,ky=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Oy=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Fy=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,By=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,zy=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Hy=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vy=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gy=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Wy=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xy=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,qy=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Yy=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,$y=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,jy=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ky=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Zy=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Jy=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Fe={alphahash_fragment:xg,alphahash_pars_fragment:bg,alphamap_fragment:Mg,alphamap_pars_fragment:wg,alphatest_fragment:Sg,alphatest_pars_fragment:Eg,aomap_fragment:Ag,aomap_pars_fragment:Tg,batching_pars_vertex:Rg,batching_vertex:Cg,begin_vertex:Ig,beginnormal_vertex:Pg,bsdfs:Lg,iridescence_fragment:Ng,bumpmap_pars_fragment:Dg,clipping_planes_fragment:Ug,clipping_planes_pars_fragment:kg,clipping_planes_pars_vertex:Og,clipping_planes_vertex:Fg,color_fragment:Bg,color_pars_fragment:zg,color_pars_vertex:Hg,color_vertex:Vg,common:Gg,cube_uv_reflection_fragment:Wg,defaultnormal_vertex:Xg,displacementmap_pars_vertex:qg,displacementmap_vertex:Yg,emissivemap_fragment:$g,emissivemap_pars_fragment:jg,colorspace_fragment:Kg,colorspace_pars_fragment:Zg,envmap_fragment:Jg,envmap_common_pars_fragment:Qg,envmap_pars_fragment:e0,envmap_pars_vertex:t0,envmap_physical_pars_fragment:d0,envmap_vertex:n0,fog_vertex:i0,fog_pars_vertex:s0,fog_fragment:r0,fog_pars_fragment:a0,gradientmap_pars_fragment:o0,lightmap_pars_fragment:c0,lights_lambert_fragment:l0,lights_lambert_pars_fragment:h0,lights_pars_begin:u0,lights_toon_fragment:f0,lights_toon_pars_fragment:p0,lights_phong_fragment:m0,lights_phong_pars_fragment:g0,lights_physical_fragment:y0,lights_physical_pars_fragment:_0,lights_fragment_begin:v0,lights_fragment_maps:x0,lights_fragment_end:b0,logdepthbuf_fragment:M0,logdepthbuf_pars_fragment:w0,logdepthbuf_pars_vertex:S0,logdepthbuf_vertex:E0,map_fragment:A0,map_pars_fragment:T0,map_particle_fragment:R0,map_particle_pars_fragment:C0,metalnessmap_fragment:I0,metalnessmap_pars_fragment:P0,morphinstance_vertex:L0,morphcolor_vertex:N0,morphnormal_vertex:D0,morphtarget_pars_vertex:U0,morphtarget_vertex:k0,normal_fragment_begin:O0,normal_fragment_maps:F0,normal_pars_fragment:B0,normal_pars_vertex:z0,normal_vertex:H0,normalmap_pars_fragment:V0,clearcoat_normal_fragment_begin:G0,clearcoat_normal_fragment_maps:W0,clearcoat_pars_fragment:X0,iridescence_pars_fragment:q0,opaque_fragment:Y0,packing:$0,premultiplied_alpha_fragment:j0,project_vertex:K0,dithering_fragment:Z0,dithering_pars_fragment:J0,roughnessmap_fragment:Q0,roughnessmap_pars_fragment:ey,shadowmap_pars_fragment:ty,shadowmap_pars_vertex:ny,shadowmap_vertex:iy,shadowmask_pars_fragment:sy,skinbase_vertex:ry,skinning_pars_vertex:ay,skinning_vertex:oy,skinnormal_vertex:cy,specularmap_fragment:ly,specularmap_pars_fragment:hy,tonemapping_fragment:uy,tonemapping_pars_fragment:dy,transmission_fragment:fy,transmission_pars_fragment:py,uv_pars_fragment:my,uv_pars_vertex:gy,uv_vertex:yy,worldpos_vertex:_y,background_vert:vy,background_frag:xy,backgroundCube_vert:by,backgroundCube_frag:My,cube_vert:wy,cube_frag:Sy,depth_vert:Ey,depth_frag:Ay,distanceRGBA_vert:Ty,distanceRGBA_frag:Ry,equirect_vert:Cy,equirect_frag:Iy,linedashed_vert:Py,linedashed_frag:Ly,meshbasic_vert:Ny,meshbasic_frag:Dy,meshlambert_vert:Uy,meshlambert_frag:ky,meshmatcap_vert:Oy,meshmatcap_frag:Fy,meshnormal_vert:By,meshnormal_frag:zy,meshphong_vert:Hy,meshphong_frag:Vy,meshphysical_vert:Gy,meshphysical_frag:Wy,meshtoon_vert:Xy,meshtoon_frag:qy,points_vert:Yy,points_frag:$y,shadow_vert:jy,shadow_frag:Ky,sprite_vert:Zy,sprite_frag:Jy},le={common:{diffuse:{value:new Ie(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Be}},envmap:{envMap:{value:null},envMapRotation:{value:new Be},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Be}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Be}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Be},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Be},normalScale:{value:new Te(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Be},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Be}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Be}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Be}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ie(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ie(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0},uvTransform:{value:new Be}},sprite:{diffuse:{value:new Ie(16777215)},opacity:{value:1},center:{value:new Te(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Be},alphaMap:{value:null},alphaMapTransform:{value:new Be},alphaTest:{value:0}}},wn={basic:{uniforms:Ft([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.fog]),vertexShader:Fe.meshbasic_vert,fragmentShader:Fe.meshbasic_frag},lambert:{uniforms:Ft([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Ie(0)}}]),vertexShader:Fe.meshlambert_vert,fragmentShader:Fe.meshlambert_frag},phong:{uniforms:Ft([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Ie(0)},specular:{value:new Ie(1118481)},shininess:{value:30}}]),vertexShader:Fe.meshphong_vert,fragmentShader:Fe.meshphong_frag},standard:{uniforms:Ft([le.common,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.roughnessmap,le.metalnessmap,le.fog,le.lights,{emissive:{value:new Ie(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag},toon:{uniforms:Ft([le.common,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.gradientmap,le.fog,le.lights,{emissive:{value:new Ie(0)}}]),vertexShader:Fe.meshtoon_vert,fragmentShader:Fe.meshtoon_frag},matcap:{uniforms:Ft([le.common,le.bumpmap,le.normalmap,le.displacementmap,le.fog,{matcap:{value:null}}]),vertexShader:Fe.meshmatcap_vert,fragmentShader:Fe.meshmatcap_frag},points:{uniforms:Ft([le.points,le.fog]),vertexShader:Fe.points_vert,fragmentShader:Fe.points_frag},dashed:{uniforms:Ft([le.common,le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Fe.linedashed_vert,fragmentShader:Fe.linedashed_frag},depth:{uniforms:Ft([le.common,le.displacementmap]),vertexShader:Fe.depth_vert,fragmentShader:Fe.depth_frag},normal:{uniforms:Ft([le.common,le.bumpmap,le.normalmap,le.displacementmap,{opacity:{value:1}}]),vertexShader:Fe.meshnormal_vert,fragmentShader:Fe.meshnormal_frag},sprite:{uniforms:Ft([le.sprite,le.fog]),vertexShader:Fe.sprite_vert,fragmentShader:Fe.sprite_frag},background:{uniforms:{uvTransform:{value:new Be},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Fe.background_vert,fragmentShader:Fe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Be}},vertexShader:Fe.backgroundCube_vert,fragmentShader:Fe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Fe.cube_vert,fragmentShader:Fe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Fe.equirect_vert,fragmentShader:Fe.equirect_frag},distanceRGBA:{uniforms:Ft([le.common,le.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Fe.distanceRGBA_vert,fragmentShader:Fe.distanceRGBA_frag},shadow:{uniforms:Ft([le.lights,le.fog,{color:{value:new Ie(0)},opacity:{value:1}}]),vertexShader:Fe.shadow_vert,fragmentShader:Fe.shadow_frag}};wn.physical={uniforms:Ft([wn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Be},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Be},clearcoatNormalScale:{value:new Te(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Be},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Be},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Be},sheen:{value:0},sheenColor:{value:new Ie(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Be},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Be},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Be},transmissionSamplerSize:{value:new Te},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Be},attenuationDistance:{value:0},attenuationColor:{value:new Ie(0)},specularColor:{value:new Ie(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Be},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Be},anisotropyVector:{value:new Te},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Be}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag};Xr={r:0,b:0,g:0},Ai=new Tn,Qy=new Oe;Ms=class extends ya{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,a=n+e,o=s+t,c=s-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},cs=4,Wu=[.125,.215,.35,.446,.526,.582],Pi=20,ac=new Ms,Xu=new Ie,oc=null,cc=0,lc=0,hc=!1,Ri=(1+Math.sqrt(5))/2,is=1/Ri,qu=[new O(-Ri,is,0),new O(Ri,is,0),new O(-is,0,Ri),new O(is,0,Ri),new O(0,Ri,-is),new O(0,Ri,is),new O(-1,1,-1),new O(1,1,-1),new O(-1,1,1),new O(1,1,1)],xa=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,s=100){oc=this._renderer.getRenderTarget(),cc=this._renderer.getActiveCubeFace(),lc=this._renderer.getActiveMipmapLevel(),hc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(e,n,s,r),t>0&&this._blur(r,0,0,t),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ju(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=$u(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(oc,cc,lc),this._renderer.xr.enabled=hc,e.scissorTest=!1,qr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ps||e.mapping===ms?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),oc=this._renderer.getRenderTarget(),cc=this._renderer.getActiveCubeFace(),lc=this._renderer.getActiveMipmapLevel(),hc=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Xt,minFilter:Xt,generateMipmaps:!1,type:fr,format:hn,colorSpace:Et,depthBuffer:!1},s=Yu(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Yu(e,t,n);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=a_(r)),this._blurMaterial=o_(r,e,t)}return s}_compileMaterial(e){let t=new gt(this._lodPlanes[0],e);this._renderer.compile(t,ac)}_sceneToCubeUV(e,t,n,s){let o=new _t(90,1,t,n),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,d=h.toneMapping;h.getClearColor(Xu),h.toneMapping=ai,h.autoClear=!1;let f=new $t({name:"PMREM.Background",side:qt,depthWrite:!1,depthTest:!1}),g=new gt(new nr,f),y=!1,p=e.background;p?p.isColor&&(f.color.copy(p),e.background=null,y=!0):(f.color.copy(Xu),y=!0);for(let m=0;m<6;m++){let _=m%3;_===0?(o.up.set(0,c[m],0),o.lookAt(l[m],0,0)):_===1?(o.up.set(0,0,c[m]),o.lookAt(0,l[m],0)):(o.up.set(0,c[m],0),o.lookAt(0,0,l[m]));let x=this._cubeSize;qr(s,_*x,m>2?x:0,x,x),h.setRenderTarget(s),y&&h.render(g,o),h.render(e,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=u,e.background=p}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===ps||e.mapping===ms;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=ju()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=$u());let r=s?this._cubemapMaterial:this._equirectMaterial,a=new gt(this._lodPlanes[0],r),o=r.uniforms;o.envMap.value=e;let c=this._cubeSize;qr(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,ac)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodPlanes.length;for(let r=1;r<s;r++){let a=Math.sqrt(this._sigmas[r]*this._sigmas[r]-this._sigmas[r-1]*this._sigmas[r-1]),o=qu[(s-r-1)%qu.length];this._blur(e,r-1,r,a,o)}t.autoClear=n}_blur(e,t,n,s,r){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,s,"latitudinal",r),this._halfBlur(a,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,a,o){let c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new gt(this._lodPlanes[s],l),d=l.uniforms,f=this._sizeLods[n]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Pi-1),y=r/g,p=isFinite(r)?1+Math.floor(h*y):Pi;p>Pi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Pi}`);let m=[],_=0;for(let E=0;E<Pi;++E){let N=E/y,j=Math.exp(-N*N/2);m.push(j),E===0?_+=j:E<p&&(_+=2*j)}for(let E=0;E<m.length;E++)m[E]=m[E]/_;d.envMap.value=e.texture,d.samples.value=p,d.weights.value=m,d.latitudinal.value=a==="latitudinal",o&&(d.poleAxis.value=o);let{_lodMax:x}=this;d.dTheta.value=g,d.mipInt.value=x-n;let b=this._sizeLods[s],C=3*b*(s>x-cs?s-x+cs:0),A=4*(this._cubeSize-b);qr(t,C,A,3*b,2*b),c.setRenderTarget(t),c.render(u,ac)}};ba=class extends Lt{constructor(e,t,n,s,r,a,o,c,l,h=hs){if(h!==hs&&h!==ys)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===hs&&(n=Ni),n===void 0&&h===ys&&(n=gs),super(null,s,r,a,o,c,h,n,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:kt,this.minFilter=c!==void 0?c:kt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Kd=new Lt,Ku=new ba(1,1),Zd=new fa,Jd=new il,Qd=new _a,Zu=[],Ju=[],Qu=new Float32Array(16),ed=new Float32Array(9),td=new Float32Array(4);al=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=D_(t.type)}},ol=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=ev(t.type)}},cl=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(e,t[o.id],n)}}},uc=/(\w+)(\])?(\[|\.)?/g;ds=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<n;++s){let r=e.getActiveUniform(t,s),a=e.getUniformLocation(t,r.name);tv(r,a,this)}}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){let o=t[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let a=e[s];a.id in t&&n.push(a)}return n}};nv=37297,iv=0;Yr=new O;dv=/^[ \t]*#include +<([\w\d./]+)>/gm;fv=new Map;mv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;wv=0,hl=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(s)===!1&&(a.add(s),s.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new ul(e),t.set(e,n)),n}},ul=class{constructor(e){this.id=wv++,this.code=e,this.usedTimes=0}};Iv=0;dl=class extends an{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Sm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},fl=class extends an{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},Dv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Uv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;Ov={[vc]:xc,[bc]:Sc,[Mc]:Ec,[fs]:wc,[xc]:vc,[Sc]:bc,[Ec]:Mc,[wc]:fs};pl=class extends _t{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},Bt=class extends ut{constructor(){super(),this.isGroup=!0,this.type="Group"}},Vv={type:"move"},Js=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Bt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Bt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Bt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(let y of e.hand.values()){let p=t.getJointPose(y,n),m=this._getHandJoint(l,y);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;l.inputState.pinching&&d>f+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&d<=f-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Vv)))}return o!==null&&(o.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Bt;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Gv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Wv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,ml=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){let s=new Lt,r=e.properties.get(s);r.__webglTexture=t.texture,(t.depthNear!=n.depthNear||t.depthFar!=n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=s}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Rn({vertexShader:Gv,fragmentShader:Wv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new gt(new va(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},gl=class extends An{constructor(e,t){super();let n=this,s=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,u=null,d=null,f=null,g=null,y=new ml,p=t.getContextAttributes(),m=null,_=null,x=[],b=[],C=new Te,A=null,E=new _t;E.layers.enable(1),E.viewport=new Ke;let N=new _t;N.layers.enable(2),N.viewport=new Ke;let j=[E,N],v=new pl;v.layers.enable(1),v.layers.enable(2);let M=null,L=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Z){let ie=x[Z];return ie===void 0&&(ie=new Js,x[Z]=ie),ie.getTargetRaySpace()},this.getControllerGrip=function(Z){let ie=x[Z];return ie===void 0&&(ie=new Js,x[Z]=ie),ie.getGripSpace()},this.getHand=function(Z){let ie=x[Z];return ie===void 0&&(ie=new Js,x[Z]=ie),ie.getHandSpace()};function U(Z){let ie=b.indexOf(Z.inputSource);if(ie===-1)return;let B=x[ie];B!==void 0&&(B.update(Z.inputSource,Z.frame,l||a),B.dispatchEvent({type:Z.type,data:Z.inputSource}))}function I(){s.removeEventListener("select",U),s.removeEventListener("selectstart",U),s.removeEventListener("selectend",U),s.removeEventListener("squeeze",U),s.removeEventListener("squeezestart",U),s.removeEventListener("squeezeend",U),s.removeEventListener("end",I),s.removeEventListener("inputsourceschange",R);for(let Z=0;Z<x.length;Z++){let ie=b[Z];ie!==null&&(b[Z]=null,x[Z].disconnect(ie))}M=null,L=null,y.reset(),e.setRenderTarget(m),f=null,d=null,u=null,s=null,_=null,Ve.stop(),n.isPresenting=!1,e.setPixelRatio(A),e.setSize(C.width,C.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Z){r=Z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Z){o=Z,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(Z){l=Z},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(Z){if(s=Z,s!==null){if(m=e.getRenderTarget(),s.addEventListener("select",U),s.addEventListener("selectstart",U),s.addEventListener("selectend",U),s.addEventListener("squeeze",U),s.addEventListener("squeezestart",U),s.addEventListener("squeezeend",U),s.addEventListener("end",I),s.addEventListener("inputsourceschange",R),p.xrCompatible!==!0&&await t.makeXRCompatible(),A=e.getPixelRatio(),e.getSize(C),s.renderState.layers===void 0){let ie={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,ie),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),_=new Vn(f.framebufferWidth,f.framebufferHeight,{format:hn,type:Hn,colorSpace:e.outputColorSpace,stencilBuffer:p.stencil})}else{let ie=null,B=null,G=null;p.depth&&(G=p.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ie=p.stencil?ys:hs,B=p.stencil?gs:Ni);let ce={colorFormat:t.RGBA8,depthFormat:G,scaleFactor:r};u=new XRWebGLBinding(s,t),d=u.createProjectionLayer(ce),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),_=new Vn(d.textureWidth,d.textureHeight,{format:hn,type:Hn,depthTexture:new ba(d.textureWidth,d.textureHeight,B,void 0,void 0,void 0,void 0,void 0,void 0,ie),stencilBuffer:p.stencil,colorSpace:e.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await s.requestReferenceSpace(o),Ve.setContext(s),Ve.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return y.getDepthTexture()};function R(Z){for(let ie=0;ie<Z.removed.length;ie++){let B=Z.removed[ie],G=b.indexOf(B);G>=0&&(b[G]=null,x[G].disconnect(B))}for(let ie=0;ie<Z.added.length;ie++){let B=Z.added[ie],G=b.indexOf(B);if(G===-1){for(let ge=0;ge<x.length;ge++)if(ge>=b.length){b.push(B),G=ge;break}else if(b[ge]===null){b[ge]=B,G=ge;break}if(G===-1)break}let ce=x[G];ce&&ce.connect(B)}}let P=new O,$=new O;function V(Z,ie,B){P.setFromMatrixPosition(ie.matrixWorld),$.setFromMatrixPosition(B.matrixWorld);let G=P.distanceTo($),ce=ie.projectionMatrix.elements,ge=B.projectionMatrix.elements,Ue=ce[14]/(ce[10]-1),Ze=ce[14]/(ce[10]+1),ze=(ce[9]+1)/ce[5],D=(ce[9]-1)/ce[5],Jt=(ce[8]-1)/ce[0],Ge=(ge[8]+1)/ge[0],Ye=Ue*Jt,Pe=Ue*Ge,at=G/(-Jt+Ge),De=at*-Jt;if(ie.matrixWorld.decompose(Z.position,Z.quaternion,Z.scale),Z.translateX(De),Z.translateZ(at),Z.matrixWorld.compose(Z.position,Z.quaternion,Z.scale),Z.matrixWorldInverse.copy(Z.matrixWorld).invert(),ce[10]===-1)Z.projectionMatrix.copy(ie.projectionMatrix),Z.projectionMatrixInverse.copy(ie.projectionMatrixInverse);else{let T=Ue+at,w=Ze+at,W=Ye-De,Q=Pe+(G-De),ne=ze*Ze/w*T,J=D*Ze/w*T;Z.projectionMatrix.makePerspective(W,Q,ne,J,T,w),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert()}}function k(Z,ie){ie===null?Z.matrixWorld.copy(Z.matrix):Z.matrixWorld.multiplyMatrices(ie.matrixWorld,Z.matrix),Z.matrixWorldInverse.copy(Z.matrixWorld).invert()}this.updateCamera=function(Z){if(s===null)return;let ie=Z.near,B=Z.far;y.texture!==null&&(y.depthNear>0&&(ie=y.depthNear),y.depthFar>0&&(B=y.depthFar)),v.near=N.near=E.near=ie,v.far=N.far=E.far=B,(M!==v.near||L!==v.far)&&(s.updateRenderState({depthNear:v.near,depthFar:v.far}),M=v.near,L=v.far);let G=Z.parent,ce=v.cameras;k(v,G);for(let ge=0;ge<ce.length;ge++)k(ce[ge],G);ce.length===2?V(v,E,N):v.projectionMatrix.copy(E.projectionMatrix),Y(Z,v,G)};function Y(Z,ie,B){B===null?Z.matrix.copy(ie.matrixWorld):(Z.matrix.copy(B.matrixWorld),Z.matrix.invert(),Z.matrix.multiply(ie.matrixWorld)),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.updateMatrixWorld(!0),Z.projectionMatrix.copy(ie.projectionMatrix),Z.projectionMatrixInverse.copy(ie.projectionMatrixInverse),Z.isPerspectiveCamera&&(Z.fov=xs*2*Math.atan(1/Z.projectionMatrix.elements[5]),Z.zoom=1)}this.getCamera=function(){return v},this.getFoveation=function(){if(!(d===null&&f===null))return c},this.setFoveation=function(Z){c=Z,d!==null&&(d.fixedFoveation=Z),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Z)},this.hasDepthSensing=function(){return y.texture!==null},this.getDepthSensingMesh=function(){return y.getMesh(v)};let se=null;function Se(Z,ie){if(h=ie.getViewerPose(l||a),g=ie,h!==null){let B=h.views;f!==null&&(e.setRenderTargetFramebuffer(_,f.framebuffer),e.setRenderTarget(_));let G=!1;B.length!==v.cameras.length&&(v.cameras.length=0,G=!0);for(let ge=0;ge<B.length;ge++){let Ue=B[ge],Ze=null;if(f!==null)Ze=f.getViewport(Ue);else{let D=u.getViewSubImage(d,Ue);Ze=D.viewport,ge===0&&(e.setRenderTargetTextures(_,D.colorTexture,d.ignoreDepthValues?void 0:D.depthStencilTexture),e.setRenderTarget(_))}let ze=j[ge];ze===void 0&&(ze=new _t,ze.layers.enable(ge),ze.viewport=new Ke,j[ge]=ze),ze.matrix.fromArray(Ue.transform.matrix),ze.matrix.decompose(ze.position,ze.quaternion,ze.scale),ze.projectionMatrix.fromArray(Ue.projectionMatrix),ze.projectionMatrixInverse.copy(ze.projectionMatrix).invert(),ze.viewport.set(Ze.x,Ze.y,Ze.width,Ze.height),ge===0&&(v.matrix.copy(ze.matrix),v.matrix.decompose(v.position,v.quaternion,v.scale)),G===!0&&v.cameras.push(ze)}let ce=s.enabledFeatures;if(ce&&ce.includes("depth-sensing")){let ge=u.getDepthInformation(B[0]);ge&&ge.isValid&&ge.texture&&y.init(e,ge,s.renderState)}}for(let B=0;B<x.length;B++){let G=b[B],ce=x[B];G!==null&&ce!==void 0&&ce.update(G,ie,l||a)}se&&se(Z,ie),ie.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ie}),g=null}let Ve=new jd;Ve.setAnimationLoop(Se),this.setAnimationLoop=function(Z){se=Z},this.dispose=function(){}}},Ti=new Tn,Xv=new Oe;Ma=class{constructor(e={}){let{canvas:t=Km(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1}=e;this.isWebGLRenderer=!0;let d;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");d=n.getContextAttributes().alpha}else d=a;let f=new Uint32Array(4),g=new Int32Array(4),y=null,p=null,m=[],_=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Ut,this.toneMapping=ai,this.toneMappingExposure=1;let x=this,b=!1,C=0,A=0,E=null,N=-1,j=null,v=new Ke,M=new Ke,L=null,U=new Ie(0),I=0,R=t.width,P=t.height,$=1,V=null,k=null,Y=new Ke(0,0,R,P),se=new Ke(0,0,R,P),Se=!1,Ve=new ir,Z=!1,ie=!1,B=new Oe,G=new Oe,ce=new O,ge=new Ke,Ue={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},Ze=!1;function ze(){return E===null?$:1}let D=n;function Jt(S,z){return t.getContext(S,z)}try{let S={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r169"),t.addEventListener("webglcontextlost",ee,!1),t.addEventListener("webglcontextrestored",de,!1),t.addEventListener("webglcontextcreationerror",me,!1),D===null){let z="webgl2";if(D=Jt(z,S),D===null)throw Jt(z)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let Ge,Ye,Pe,at,De,T,w,W,Q,ne,J,Me,ue,ye,$e,re,_e,Le,Ne,ve,We,ke,rt,F;function pe(){Ge=new l_(D),Ge.init(),ke=new Hv(D,Ge),Ye=new i_(D,Ge,e,ke),Pe=new Fv(D),Ye.reverseDepthBuffer&&Pe.buffers.depth.setReversed(!0),at=new d_(D),De=new Ev,T=new zv(D,Ge,Pe,De,Ye,ke,at),w=new r_(x),W=new c_(x),Q=new vg(D),rt=new t_(D,Q),ne=new h_(D,Q,at,rt),J=new p_(D,ne,Q,at),Ne=new f_(D,Ye,T),re=new s_(De),Me=new Sv(x,w,W,Ge,Ye,rt,re),ue=new qv(x,De),ye=new Tv,$e=new Nv(Ge),Le=new e_(x,w,W,Pe,J,d,c),_e=new kv(x,J,Ye),F=new Yv(D,at,Ye,Pe),ve=new n_(D,Ge,at),We=new u_(D,Ge,at),at.programs=Me.programs,x.capabilities=Ye,x.extensions=Ge,x.properties=De,x.renderLists=ye,x.shadowMap=_e,x.state=Pe,x.info=at}pe();let K=new gl(x,D);this.xr=K,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){let S=Ge.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=Ge.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return $},this.setPixelRatio=function(S){S!==void 0&&($=S,this.setSize(R,P,!1))},this.getSize=function(S){return S.set(R,P)},this.setSize=function(S,z,X=!0){if(K.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}R=S,P=z,t.width=Math.floor(S*$),t.height=Math.floor(z*$),X===!0&&(t.style.width=S+"px",t.style.height=z+"px"),this.setViewport(0,0,S,z)},this.getDrawingBufferSize=function(S){return S.set(R*$,P*$).floor()},this.setDrawingBufferSize=function(S,z,X){R=S,P=z,$=X,t.width=Math.floor(S*X),t.height=Math.floor(z*X),this.setViewport(0,0,S,z)},this.getCurrentViewport=function(S){return S.copy(v)},this.getViewport=function(S){return S.copy(Y)},this.setViewport=function(S,z,X,q){S.isVector4?Y.set(S.x,S.y,S.z,S.w):Y.set(S,z,X,q),Pe.viewport(v.copy(Y).multiplyScalar($).round())},this.getScissor=function(S){return S.copy(se)},this.setScissor=function(S,z,X,q){S.isVector4?se.set(S.x,S.y,S.z,S.w):se.set(S,z,X,q),Pe.scissor(M.copy(se).multiplyScalar($).round())},this.getScissorTest=function(){return Se},this.setScissorTest=function(S){Pe.setScissorTest(Se=S)},this.setOpaqueSort=function(S){V=S},this.setTransparentSort=function(S){k=S},this.getClearColor=function(S){return S.copy(Le.getClearColor())},this.setClearColor=function(){Le.setClearColor.apply(Le,arguments)},this.getClearAlpha=function(){return Le.getClearAlpha()},this.setClearAlpha=function(){Le.setClearAlpha.apply(Le,arguments)},this.clear=function(S=!0,z=!0,X=!0){let q=0;if(S){let H=!1;if(E!==null){let ae=E.texture.format;H=ae===Ol||ae===kl||ae===Ul}if(H){let ae=E.texture.type,fe=ae===Hn||ae===Ni||ae===er||ae===gs||ae===Ll||ae===Nl,xe=Le.getClearColor(),be=Le.getClearAlpha(),Re=xe.r,Ce=xe.g,we=xe.b;fe?(f[0]=Re,f[1]=Ce,f[2]=we,f[3]=be,D.clearBufferuiv(D.COLOR,0,f)):(g[0]=Re,g[1]=Ce,g[2]=we,g[3]=be,D.clearBufferiv(D.COLOR,0,g))}else q|=D.COLOR_BUFFER_BIT}z&&(q|=D.DEPTH_BUFFER_BIT,D.clearDepth(this.capabilities.reverseDepthBuffer?0:1)),X&&(q|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(q)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",ee,!1),t.removeEventListener("webglcontextrestored",de,!1),t.removeEventListener("webglcontextcreationerror",me,!1),ye.dispose(),$e.dispose(),De.dispose(),w.dispose(),W.dispose(),J.dispose(),rt.dispose(),F.dispose(),Me.dispose(),K.dispose(),K.removeEventListener("sessionstart",nu),K.removeEventListener("sessionend",iu),_i.stop()};function ee(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function de(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;let S=at.autoReset,z=_e.enabled,X=_e.autoUpdate,q=_e.needsUpdate,H=_e.type;pe(),at.autoReset=S,_e.enabled=z,_e.autoUpdate=X,_e.needsUpdate=q,_e.type=H}function me(S){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Xe(S){let z=S.target;z.removeEventListener("dispose",Xe),pt(z)}function pt(S){Gt(S),De.remove(S)}function Gt(S){let z=De.get(S).programs;z!==void 0&&(z.forEach(function(X){Me.releaseProgram(X)}),S.isShaderMaterial&&Me.releaseShaderCache(S))}this.renderBufferDirect=function(S,z,X,q,H,ae){z===null&&(z=Ue);let fe=H.isMesh&&H.matrixWorld.determinant()<0,xe=Pp(S,z,X,q,H);Pe.setMaterial(q,fe);let be=X.index,Re=1;if(q.wireframe===!0){if(be=ne.getWireframeAttribute(X),be===void 0)return;Re=2}let Ce=X.drawRange,we=X.attributes.position,et=Ce.start*Re,ot=(Ce.start+Ce.count)*Re;ae!==null&&(et=Math.max(et,ae.start*Re),ot=Math.min(ot,(ae.start+ae.count)*Re)),be!==null?(et=Math.max(et,0),ot=Math.min(ot,be.count)):we!=null&&(et=Math.max(et,0),ot=Math.min(ot,we.count));let ht=ot-et;if(ht<0||ht===1/0)return;rt.setup(H,q,xe,X,be);let Qt,Je=ve;if(be!==null&&(Qt=Q.get(be),Je=We,Je.setIndex(Qt)),H.isMesh)q.wireframe===!0?(Pe.setLineWidth(q.wireframeLinewidth*ze()),Je.setMode(D.LINES)):Je.setMode(D.TRIANGLES);else if(H.isLine){let Ee=q.linewidth;Ee===void 0&&(Ee=1),Pe.setLineWidth(Ee*ze()),H.isLineSegments?Je.setMode(D.LINES):H.isLineLoop?Je.setMode(D.LINE_LOOP):Je.setMode(D.LINE_STRIP)}else H.isPoints?Je.setMode(D.POINTS):H.isSprite&&Je.setMode(D.TRIANGLES);if(H.isBatchedMesh)if(H._multiDrawInstances!==null)Je.renderMultiDrawInstances(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount,H._multiDrawInstances);else if(Ge.get("WEBGL_multi_draw"))Je.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let Ee=H._multiDrawStarts,Tt=H._multiDrawCounts,Qe=H._multiDrawCount,fn=be?Q.get(be).bytesPerElement:1,Vi=De.get(q).currentProgram.getUniforms();for(let en=0;en<Qe;en++)Vi.setValue(D,"_gl_DrawID",en),Je.render(Ee[en]/fn,Tt[en])}else if(H.isInstancedMesh)Je.renderInstances(et,ht,H.count);else if(X.isInstancedBufferGeometry){let Ee=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,Tt=Math.min(X.instanceCount,Ee);Je.renderInstances(et,ht,Tt)}else Je.render(et,ht)};function je(S,z,X){S.transparent===!0&&S.side===sn&&S.forceSinglePass===!1?(S.side=qt,S.needsUpdate=!0,Tr(S,z,X),S.side=En,S.needsUpdate=!0,Tr(S,z,X),S.side=sn):Tr(S,z,X)}this.compile=function(S,z,X=null){X===null&&(X=S),p=$e.get(X),p.init(z),_.push(p),X.traverseVisible(function(H){H.isLight&&H.layers.test(z.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),S!==X&&S.traverseVisible(function(H){H.isLight&&H.layers.test(z.layers)&&(p.pushLight(H),H.castShadow&&p.pushShadow(H))}),p.setupLights();let q=new Set;return S.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let ae=H.material;if(ae)if(Array.isArray(ae))for(let fe=0;fe<ae.length;fe++){let xe=ae[fe];je(xe,X,H),q.add(xe)}else je(ae,X,H),q.add(ae)}),_.pop(),p=null,q},this.compileAsync=function(S,z,X=null){let q=this.compile(S,z,X);return new Promise(H=>{function ae(){if(q.forEach(function(fe){De.get(fe).currentProgram.isReady()&&q.delete(fe)}),q.size===0){H(S);return}setTimeout(ae,10)}Ge.get("KHR_parallel_shader_compile")!==null?ae():setTimeout(ae,10)})};let Wt=null;function Pn(S){Wt&&Wt(S)}function nu(){_i.stop()}function iu(){_i.start()}let _i=new jd;_i.setAnimationLoop(Pn),typeof self<"u"&&_i.setContext(self),this.setAnimationLoop=function(S){Wt=S,K.setAnimationLoop(S),S===null?_i.stop():_i.start()},K.addEventListener("sessionstart",nu),K.addEventListener("sessionend",iu),this.render=function(S,z){if(z!==void 0&&z.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),z.parent===null&&z.matrixWorldAutoUpdate===!0&&z.updateMatrixWorld(),K.enabled===!0&&K.isPresenting===!0&&(K.cameraAutoUpdate===!0&&K.updateCamera(z),z=K.getCamera()),S.isScene===!0&&S.onBeforeRender(x,S,z,E),p=$e.get(S,_.length),p.init(z),_.push(p),G.multiplyMatrices(z.projectionMatrix,z.matrixWorldInverse),Ve.setFromProjectionMatrix(G),ie=this.localClippingEnabled,Z=re.init(this.clippingPlanes,ie),y=ye.get(S,m.length),y.init(),m.push(y),K.enabled===!0&&K.isPresenting===!0){let ae=x.xr.getDepthSensingMesh();ae!==null&&Po(ae,z,-1/0,x.sortObjects)}Po(S,z,0,x.sortObjects),y.finish(),x.sortObjects===!0&&y.sort(V,k),Ze=K.enabled===!1||K.isPresenting===!1||K.hasDepthSensing()===!1,Ze&&Le.addToRenderList(y,S),this.info.render.frame++,Z===!0&&re.beginShadows();let X=p.state.shadowsArray;_e.render(X,S,z),Z===!0&&re.endShadows(),this.info.autoReset===!0&&this.info.reset();let q=y.opaque,H=y.transmissive;if(p.setupLights(),z.isArrayCamera){let ae=z.cameras;if(H.length>0)for(let fe=0,xe=ae.length;fe<xe;fe++){let be=ae[fe];ru(q,H,S,be)}Ze&&Le.render(S);for(let fe=0,xe=ae.length;fe<xe;fe++){let be=ae[fe];su(y,S,be,be.viewport)}}else H.length>0&&ru(q,H,S,z),Ze&&Le.render(S),su(y,S,z);E!==null&&(T.updateMultisampleRenderTarget(E),T.updateRenderTargetMipmap(E)),S.isScene===!0&&S.onAfterRender(x,S,z),rt.resetDefaultState(),N=-1,j=null,_.pop(),_.length>0?(p=_[_.length-1],Z===!0&&re.setGlobalState(x.clippingPlanes,p.state.camera)):p=null,m.pop(),m.length>0?y=m[m.length-1]:y=null};function Po(S,z,X,q){if(S.visible===!1)return;if(S.layers.test(z.layers)){if(S.isGroup)X=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(z);else if(S.isLight)p.pushLight(S),S.castShadow&&p.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||Ve.intersectsSprite(S)){q&&ge.setFromMatrixPosition(S.matrixWorld).applyMatrix4(G);let fe=J.update(S),xe=S.material;xe.visible&&y.push(S,fe,xe,X,ge.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||Ve.intersectsObject(S))){let fe=J.update(S),xe=S.material;if(q&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),ge.copy(S.boundingSphere.center)):(fe.boundingSphere===null&&fe.computeBoundingSphere(),ge.copy(fe.boundingSphere.center)),ge.applyMatrix4(S.matrixWorld).applyMatrix4(G)),Array.isArray(xe)){let be=fe.groups;for(let Re=0,Ce=be.length;Re<Ce;Re++){let we=be[Re],et=xe[we.materialIndex];et&&et.visible&&y.push(S,fe,et,X,ge.z,we)}}else xe.visible&&y.push(S,fe,xe,X,ge.z,null)}}let ae=S.children;for(let fe=0,xe=ae.length;fe<xe;fe++)Po(ae[fe],z,X,q)}function su(S,z,X,q){let H=S.opaque,ae=S.transmissive,fe=S.transparent;p.setupLightsView(X),Z===!0&&re.setGlobalState(x.clippingPlanes,X),q&&Pe.viewport(v.copy(q)),H.length>0&&Ar(H,z,X),ae.length>0&&Ar(ae,z,X),fe.length>0&&Ar(fe,z,X),Pe.buffers.depth.setTest(!0),Pe.buffers.depth.setMask(!0),Pe.buffers.color.setMask(!0),Pe.setPolygonOffset(!1)}function ru(S,z,X,q){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[q.id]===void 0&&(p.state.transmissionRenderTarget[q.id]=new Vn(1,1,{generateMipmaps:!0,type:Ge.has("EXT_color_buffer_half_float")||Ge.has("EXT_color_buffer_float")?fr:Hn,minFilter:Sn,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:qe.workingColorSpace}));let ae=p.state.transmissionRenderTarget[q.id],fe=q.viewport||v;ae.setSize(fe.z,fe.w);let xe=x.getRenderTarget();x.setRenderTarget(ae),x.getClearColor(U),I=x.getClearAlpha(),I<1&&x.setClearColor(16777215,.5),x.clear(),Ze&&Le.render(X);let be=x.toneMapping;x.toneMapping=ai;let Re=q.viewport;if(q.viewport!==void 0&&(q.viewport=void 0),p.setupLightsView(q),Z===!0&&re.setGlobalState(x.clippingPlanes,q),Ar(S,X,q),T.updateMultisampleRenderTarget(ae),T.updateRenderTargetMipmap(ae),Ge.has("WEBGL_multisampled_render_to_texture")===!1){let Ce=!1;for(let we=0,et=z.length;we<et;we++){let ot=z[we],ht=ot.object,Qt=ot.geometry,Je=ot.material,Ee=ot.group;if(Je.side===sn&&ht.layers.test(q.layers)){let Tt=Je.side;Je.side=qt,Je.needsUpdate=!0,au(ht,X,q,Qt,Je,Ee),Je.side=Tt,Je.needsUpdate=!0,Ce=!0}}Ce===!0&&(T.updateMultisampleRenderTarget(ae),T.updateRenderTargetMipmap(ae))}x.setRenderTarget(xe),x.setClearColor(U,I),Re!==void 0&&(q.viewport=Re),x.toneMapping=be}function Ar(S,z,X){let q=z.isScene===!0?z.overrideMaterial:null;for(let H=0,ae=S.length;H<ae;H++){let fe=S[H],xe=fe.object,be=fe.geometry,Re=q===null?fe.material:q,Ce=fe.group;xe.layers.test(X.layers)&&au(xe,z,X,be,Re,Ce)}}function au(S,z,X,q,H,ae){S.onBeforeRender(x,z,X,q,H,ae),S.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),H.onBeforeRender(x,z,X,q,S,ae),H.transparent===!0&&H.side===sn&&H.forceSinglePass===!1?(H.side=qt,H.needsUpdate=!0,x.renderBufferDirect(X,z,q,H,S,ae),H.side=En,H.needsUpdate=!0,x.renderBufferDirect(X,z,q,H,S,ae),H.side=sn):x.renderBufferDirect(X,z,q,H,S,ae),S.onAfterRender(x,z,X,q,H,ae)}function Tr(S,z,X){z.isScene!==!0&&(z=Ue);let q=De.get(S),H=p.state.lights,ae=p.state.shadowsArray,fe=H.state.version,xe=Me.getParameters(S,H.state,ae,z,X),be=Me.getProgramCacheKey(xe),Re=q.programs;q.environment=S.isMeshStandardMaterial?z.environment:null,q.fog=z.fog,q.envMap=(S.isMeshStandardMaterial?W:w).get(S.envMap||q.environment),q.envMapRotation=q.environment!==null&&S.envMap===null?z.environmentRotation:S.envMapRotation,Re===void 0&&(S.addEventListener("dispose",Xe),Re=new Map,q.programs=Re);let Ce=Re.get(be);if(Ce!==void 0){if(q.currentProgram===Ce&&q.lightsStateVersion===fe)return cu(S,xe),Ce}else xe.uniforms=Me.getUniforms(S),S.onBeforeCompile(xe,x),Ce=Me.acquireProgram(xe,be),Re.set(be,Ce),q.uniforms=xe.uniforms;let we=q.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(we.clippingPlanes=re.uniform),cu(S,xe),q.needsLights=Np(S),q.lightsStateVersion=fe,q.needsLights&&(we.ambientLightColor.value=H.state.ambient,we.lightProbe.value=H.state.probe,we.directionalLights.value=H.state.directional,we.directionalLightShadows.value=H.state.directionalShadow,we.spotLights.value=H.state.spot,we.spotLightShadows.value=H.state.spotShadow,we.rectAreaLights.value=H.state.rectArea,we.ltc_1.value=H.state.rectAreaLTC1,we.ltc_2.value=H.state.rectAreaLTC2,we.pointLights.value=H.state.point,we.pointLightShadows.value=H.state.pointShadow,we.hemisphereLights.value=H.state.hemi,we.directionalShadowMap.value=H.state.directionalShadowMap,we.directionalShadowMatrix.value=H.state.directionalShadowMatrix,we.spotShadowMap.value=H.state.spotShadowMap,we.spotLightMatrix.value=H.state.spotLightMatrix,we.spotLightMap.value=H.state.spotLightMap,we.pointShadowMap.value=H.state.pointShadowMap,we.pointShadowMatrix.value=H.state.pointShadowMatrix),q.currentProgram=Ce,q.uniformsList=null,Ce}function ou(S){if(S.uniformsList===null){let z=S.currentProgram.getUniforms();S.uniformsList=ds.seqWithValue(z.seq,S.uniforms)}return S.uniformsList}function cu(S,z){let X=De.get(S);X.outputColorSpace=z.outputColorSpace,X.batching=z.batching,X.batchingColor=z.batchingColor,X.instancing=z.instancing,X.instancingColor=z.instancingColor,X.instancingMorph=z.instancingMorph,X.skinning=z.skinning,X.morphTargets=z.morphTargets,X.morphNormals=z.morphNormals,X.morphColors=z.morphColors,X.morphTargetsCount=z.morphTargetsCount,X.numClippingPlanes=z.numClippingPlanes,X.numIntersection=z.numClipIntersection,X.vertexAlphas=z.vertexAlphas,X.vertexTangents=z.vertexTangents,X.toneMapping=z.toneMapping}function Pp(S,z,X,q,H){z.isScene!==!0&&(z=Ue),T.resetTextureUnits();let ae=z.fog,fe=q.isMeshStandardMaterial?z.environment:null,xe=E===null?x.outputColorSpace:E.isXRRenderTarget===!0?E.texture.colorSpace:Et,be=(q.isMeshStandardMaterial?W:w).get(q.envMap||fe),Re=q.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Ce=!!X.attributes.tangent&&(!!q.normalMap||q.anisotropy>0),we=!!X.morphAttributes.position,et=!!X.morphAttributes.normal,ot=!!X.morphAttributes.color,ht=ai;q.toneMapped&&(E===null||E.isXRRenderTarget===!0)&&(ht=x.toneMapping);let Qt=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Je=Qt!==void 0?Qt.length:0,Ee=De.get(q),Tt=p.state.lights;if(Z===!0&&(ie===!0||S!==j)){let cn=S===j&&q.id===N;re.setState(q,S,cn)}let Qe=!1;q.version===Ee.__version?(Ee.needsLights&&Ee.lightsStateVersion!==Tt.state.version||Ee.outputColorSpace!==xe||H.isBatchedMesh&&Ee.batching===!1||!H.isBatchedMesh&&Ee.batching===!0||H.isBatchedMesh&&Ee.batchingColor===!0&&H.colorTexture===null||H.isBatchedMesh&&Ee.batchingColor===!1&&H.colorTexture!==null||H.isInstancedMesh&&Ee.instancing===!1||!H.isInstancedMesh&&Ee.instancing===!0||H.isSkinnedMesh&&Ee.skinning===!1||!H.isSkinnedMesh&&Ee.skinning===!0||H.isInstancedMesh&&Ee.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&Ee.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&Ee.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&Ee.instancingMorph===!1&&H.morphTexture!==null||Ee.envMap!==be||q.fog===!0&&Ee.fog!==ae||Ee.numClippingPlanes!==void 0&&(Ee.numClippingPlanes!==re.numPlanes||Ee.numIntersection!==re.numIntersection)||Ee.vertexAlphas!==Re||Ee.vertexTangents!==Ce||Ee.morphTargets!==we||Ee.morphNormals!==et||Ee.morphColors!==ot||Ee.toneMapping!==ht||Ee.morphTargetsCount!==Je)&&(Qe=!0):(Qe=!0,Ee.__version=q.version);let fn=Ee.currentProgram;Qe===!0&&(fn=Tr(q,z,H));let Vi=!1,en=!1,Lo=!1,dt=fn.getUniforms(),jn=Ee.uniforms;if(Pe.useProgram(fn.program)&&(Vi=!0,en=!0,Lo=!0),q.id!==N&&(N=q.id,en=!0),Vi||j!==S){Ye.reverseDepthBuffer?(B.copy(S.projectionMatrix),Jm(B),Qm(B),dt.setValue(D,"projectionMatrix",B)):dt.setValue(D,"projectionMatrix",S.projectionMatrix),dt.setValue(D,"viewMatrix",S.matrixWorldInverse);let cn=dt.map.cameraPosition;cn!==void 0&&cn.setValue(D,ce.setFromMatrixPosition(S.matrixWorld)),Ye.logarithmicDepthBuffer&&dt.setValue(D,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(q.isMeshPhongMaterial||q.isMeshToonMaterial||q.isMeshLambertMaterial||q.isMeshBasicMaterial||q.isMeshStandardMaterial||q.isShaderMaterial)&&dt.setValue(D,"isOrthographic",S.isOrthographicCamera===!0),j!==S&&(j=S,en=!0,Lo=!0)}if(H.isSkinnedMesh){dt.setOptional(D,H,"bindMatrix"),dt.setOptional(D,H,"bindMatrixInverse");let cn=H.skeleton;cn&&(cn.boneTexture===null&&cn.computeBoneTexture(),dt.setValue(D,"boneTexture",cn.boneTexture,T))}H.isBatchedMesh&&(dt.setOptional(D,H,"batchingTexture"),dt.setValue(D,"batchingTexture",H._matricesTexture,T),dt.setOptional(D,H,"batchingIdTexture"),dt.setValue(D,"batchingIdTexture",H._indirectTexture,T),dt.setOptional(D,H,"batchingColorTexture"),H._colorsTexture!==null&&dt.setValue(D,"batchingColorTexture",H._colorsTexture,T));let No=X.morphAttributes;if((No.position!==void 0||No.normal!==void 0||No.color!==void 0)&&Ne.update(H,X,fn),(en||Ee.receiveShadow!==H.receiveShadow)&&(Ee.receiveShadow=H.receiveShadow,dt.setValue(D,"receiveShadow",H.receiveShadow)),q.isMeshGouraudMaterial&&q.envMap!==null&&(jn.envMap.value=be,jn.flipEnvMap.value=be.isCubeTexture&&be.isRenderTargetTexture===!1?-1:1),q.isMeshStandardMaterial&&q.envMap===null&&z.environment!==null&&(jn.envMapIntensity.value=z.environmentIntensity),en&&(dt.setValue(D,"toneMappingExposure",x.toneMappingExposure),Ee.needsLights&&Lp(jn,Lo),ae&&q.fog===!0&&ue.refreshFogUniforms(jn,ae),ue.refreshMaterialUniforms(jn,q,$,P,p.state.transmissionRenderTarget[S.id]),ds.upload(D,ou(Ee),jn,T)),q.isShaderMaterial&&q.uniformsNeedUpdate===!0&&(ds.upload(D,ou(Ee),jn,T),q.uniformsNeedUpdate=!1),q.isSpriteMaterial&&dt.setValue(D,"center",H.center),dt.setValue(D,"modelViewMatrix",H.modelViewMatrix),dt.setValue(D,"normalMatrix",H.normalMatrix),dt.setValue(D,"modelMatrix",H.matrixWorld),q.isShaderMaterial||q.isRawShaderMaterial){let cn=q.uniformsGroups;for(let Do=0,Dp=cn.length;Do<Dp;Do++){let lu=cn[Do];F.update(lu,fn),F.bind(lu,fn)}}return fn}function Lp(S,z){S.ambientLightColor.needsUpdate=z,S.lightProbe.needsUpdate=z,S.directionalLights.needsUpdate=z,S.directionalLightShadows.needsUpdate=z,S.pointLights.needsUpdate=z,S.pointLightShadows.needsUpdate=z,S.spotLights.needsUpdate=z,S.spotLightShadows.needsUpdate=z,S.rectAreaLights.needsUpdate=z,S.hemisphereLights.needsUpdate=z}function Np(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return E},this.setRenderTargetTextures=function(S,z,X){De.get(S.texture).__webglTexture=z,De.get(S.depthTexture).__webglTexture=X;let q=De.get(S);q.__hasExternalTextures=!0,q.__autoAllocateDepthBuffer=X===void 0,q.__autoAllocateDepthBuffer||Ge.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),q.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(S,z){let X=De.get(S);X.__webglFramebuffer=z,X.__useDefaultFramebuffer=z===void 0},this.setRenderTarget=function(S,z=0,X=0){E=S,C=z,A=X;let q=!0,H=null,ae=!1,fe=!1;if(S){let be=De.get(S);if(be.__useDefaultFramebuffer!==void 0)Pe.bindFramebuffer(D.FRAMEBUFFER,null),q=!1;else if(be.__webglFramebuffer===void 0)T.setupRenderTarget(S);else if(be.__hasExternalTextures)T.rebindTextures(S,De.get(S.texture).__webglTexture,De.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let we=S.depthTexture;if(be.__boundDepthTexture!==we){if(we!==null&&De.has(we)&&(S.width!==we.image.width||S.height!==we.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");T.setupDepthRenderbuffer(S)}}let Re=S.texture;(Re.isData3DTexture||Re.isDataArrayTexture||Re.isCompressedArrayTexture)&&(fe=!0);let Ce=De.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(Ce[z])?H=Ce[z][X]:H=Ce[z],ae=!0):S.samples>0&&T.useMultisampledRTT(S)===!1?H=De.get(S).__webglMultisampledFramebuffer:Array.isArray(Ce)?H=Ce[X]:H=Ce,v.copy(S.viewport),M.copy(S.scissor),L=S.scissorTest}else v.copy(Y).multiplyScalar($).floor(),M.copy(se).multiplyScalar($).floor(),L=Se;if(Pe.bindFramebuffer(D.FRAMEBUFFER,H)&&q&&Pe.drawBuffers(S,H),Pe.viewport(v),Pe.scissor(M),Pe.setScissorTest(L),ae){let be=De.get(S.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+z,be.__webglTexture,X)}else if(fe){let be=De.get(S.texture),Re=z||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,be.__webglTexture,X||0,Re)}N=-1},this.readRenderTargetPixels=function(S,z,X,q,H,ae,fe){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let xe=De.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&fe!==void 0&&(xe=xe[fe]),xe){Pe.bindFramebuffer(D.FRAMEBUFFER,xe);try{let be=S.texture,Re=be.format,Ce=be.type;if(!Ye.textureFormatReadable(Re)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ye.textureTypeReadable(Ce)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}z>=0&&z<=S.width-q&&X>=0&&X<=S.height-H&&D.readPixels(z,X,q,H,ke.convert(Re),ke.convert(Ce),ae)}finally{let be=E!==null?De.get(E).__webglFramebuffer:null;Pe.bindFramebuffer(D.FRAMEBUFFER,be)}}},this.readRenderTargetPixelsAsync=async function(S,z,X,q,H,ae,fe){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let xe=De.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&fe!==void 0&&(xe=xe[fe]),xe){let be=S.texture,Re=be.format,Ce=be.type;if(!Ye.textureFormatReadable(Re))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ye.textureTypeReadable(Ce))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(z>=0&&z<=S.width-q&&X>=0&&X<=S.height-H){Pe.bindFramebuffer(D.FRAMEBUFFER,xe);let we=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,we),D.bufferData(D.PIXEL_PACK_BUFFER,ae.byteLength,D.STREAM_READ),D.readPixels(z,X,q,H,ke.convert(Re),ke.convert(Ce),0);let et=E!==null?De.get(E).__webglFramebuffer:null;Pe.bindFramebuffer(D.FRAMEBUFFER,et);let ot=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await Zm(D,ot,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,we),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ae),D.deleteBuffer(we),D.deleteSync(ot),ae}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(S,z=null,X=0){S.isTexture!==!0&&(aa("WebGLRenderer: copyFramebufferToTexture function signature has changed."),z=arguments[0]||null,S=arguments[1]);let q=Math.pow(2,-X),H=Math.floor(S.image.width*q),ae=Math.floor(S.image.height*q),fe=z!==null?z.x:0,xe=z!==null?z.y:0;T.setTexture2D(S,0),D.copyTexSubImage2D(D.TEXTURE_2D,X,0,0,fe,xe,H,ae),Pe.unbindTexture()},this.copyTextureToTexture=function(S,z,X=null,q=null,H=0){S.isTexture!==!0&&(aa("WebGLRenderer: copyTextureToTexture function signature has changed."),q=arguments[0]||null,S=arguments[1],z=arguments[2],H=arguments[3]||0,X=null);let ae,fe,xe,be,Re,Ce;X!==null?(ae=X.max.x-X.min.x,fe=X.max.y-X.min.y,xe=X.min.x,be=X.min.y):(ae=S.image.width,fe=S.image.height,xe=0,be=0),q!==null?(Re=q.x,Ce=q.y):(Re=0,Ce=0);let we=ke.convert(z.format),et=ke.convert(z.type);T.setTexture2D(z,0),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,z.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,z.unpackAlignment);let ot=D.getParameter(D.UNPACK_ROW_LENGTH),ht=D.getParameter(D.UNPACK_IMAGE_HEIGHT),Qt=D.getParameter(D.UNPACK_SKIP_PIXELS),Je=D.getParameter(D.UNPACK_SKIP_ROWS),Ee=D.getParameter(D.UNPACK_SKIP_IMAGES),Tt=S.isCompressedTexture?S.mipmaps[H]:S.image;D.pixelStorei(D.UNPACK_ROW_LENGTH,Tt.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Tt.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,xe),D.pixelStorei(D.UNPACK_SKIP_ROWS,be),S.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,H,Re,Ce,ae,fe,we,et,Tt.data):S.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,H,Re,Ce,Tt.width,Tt.height,we,Tt.data):D.texSubImage2D(D.TEXTURE_2D,H,Re,Ce,ae,fe,we,et,Tt),D.pixelStorei(D.UNPACK_ROW_LENGTH,ot),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,ht),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Qt),D.pixelStorei(D.UNPACK_SKIP_ROWS,Je),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ee),H===0&&z.generateMipmaps&&D.generateMipmap(D.TEXTURE_2D),Pe.unbindTexture()},this.copyTextureToTexture3D=function(S,z,X=null,q=null,H=0){S.isTexture!==!0&&(aa("WebGLRenderer: copyTextureToTexture3D function signature has changed."),X=arguments[0]||null,q=arguments[1]||null,S=arguments[2],z=arguments[3],H=arguments[4]||0);let ae,fe,xe,be,Re,Ce,we,et,ot,ht=S.isCompressedTexture?S.mipmaps[H]:S.image;X!==null?(ae=X.max.x-X.min.x,fe=X.max.y-X.min.y,xe=X.max.z-X.min.z,be=X.min.x,Re=X.min.y,Ce=X.min.z):(ae=ht.width,fe=ht.height,xe=ht.depth,be=0,Re=0,Ce=0),q!==null?(we=q.x,et=q.y,ot=q.z):(we=0,et=0,ot=0);let Qt=ke.convert(z.format),Je=ke.convert(z.type),Ee;if(z.isData3DTexture)T.setTexture3D(z,0),Ee=D.TEXTURE_3D;else if(z.isDataArrayTexture||z.isCompressedArrayTexture)T.setTexture2DArray(z,0),Ee=D.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,z.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,z.unpackAlignment);let Tt=D.getParameter(D.UNPACK_ROW_LENGTH),Qe=D.getParameter(D.UNPACK_IMAGE_HEIGHT),fn=D.getParameter(D.UNPACK_SKIP_PIXELS),Vi=D.getParameter(D.UNPACK_SKIP_ROWS),en=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,ht.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,ht.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,be),D.pixelStorei(D.UNPACK_SKIP_ROWS,Re),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ce),S.isDataTexture||S.isData3DTexture?D.texSubImage3D(Ee,H,we,et,ot,ae,fe,xe,Qt,Je,ht.data):z.isCompressedArrayTexture?D.compressedTexSubImage3D(Ee,H,we,et,ot,ae,fe,xe,Qt,ht.data):D.texSubImage3D(Ee,H,we,et,ot,ae,fe,xe,Qt,Je,ht),D.pixelStorei(D.UNPACK_ROW_LENGTH,Tt),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Qe),D.pixelStorei(D.UNPACK_SKIP_PIXELS,fn),D.pixelStorei(D.UNPACK_SKIP_ROWS,Vi),D.pixelStorei(D.UNPACK_SKIP_IMAGES,en),H===0&&z.generateMipmaps&&D.generateMipmap(Ee),Pe.unbindTexture()},this.initRenderTarget=function(S){De.get(S).__webglFramebuffer===void 0&&T.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?T.setTextureCube(S,0):S.isData3DTexture?T.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?T.setTexture2DArray(S,0):T.setTexture2D(S,0),Pe.unbindTexture()},this.resetState=function(){C=0,A=0,E=null,Pe.reset(),rt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return zn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=e===Bl?"display-p3":"srgb",t.unpackColorSpace=qe.workingColorSpace===Ya?"display-p3":"srgb"}},wa=class extends ut{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Tn,this.environmentIntensity=1,this.environmentRotation=new Tn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},sr=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=el,this.updateRanges=[],this.version=0,this.uuid=xn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=xn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=xn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Ot=new O,rr=class i{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Ot.fromBufferAttribute(this,t),Ot.applyMatrix4(e),this.setXYZ(t,Ot.x,Ot.y,Ot.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ot.fromBufferAttribute(this,t),Ot.applyNormalMatrix(e),this.setXYZ(t,Ot.x,Ot.y,Ot.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ot.fromBufferAttribute(this,t),Ot.transformDirection(e),this.setXYZ(t,Ot.x,Ot.y,Ot.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=_n(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=_n(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=_n(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=_n(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=_n(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new vt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new i(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},fd=new O,pd=new Ke,md=new Ke,$v=new O,gd=new Oe,$r=new O,dc=new rn,yd=new Oe,fc=new oi,Sa=class extends gt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=wu,this.bindMatrix=new Oe,this.bindMatrixInverse=new Oe,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Yt),this.boundingBox.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,$r),this.boundingBox.expandByPoint($r)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new rn),this.boundingSphere.makeEmpty();let t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,$r),this.boundingSphere.expandByPoint($r)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,s=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),dc.copy(this.boundingSphere),dc.applyMatrix4(s),e.ray.intersectsSphere(dc)!==!1&&(yd.copy(s).invert(),fc.copy(e.ray).applyMatrix4(yd),!(this.boundingBox!==null&&fc.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,fc)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new Ke,t=this.geometry.attributes.skinWeight;for(let n=0,s=t.count;n<s;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===wu?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===vm?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,s=this.geometry;pd.fromBufferAttribute(s.attributes.skinIndex,e),md.fromBufferAttribute(s.attributes.skinWeight,e),fd.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){let a=md.getComponent(r);if(a!==0){let o=pd.getComponent(r);gd.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector($v.copy(fd).applyMatrix4(gd),a)}}return t.applyMatrix4(this.bindMatrixInverse)}},ar=class extends ut{constructor(){super(),this.isBone=!0,this.type="Bone"}},Ea=class extends Lt{constructor(e=null,t=1,n=1,s,r,a,o,c,l=kt,h=kt,u,d){super(null,a,o,c,l,h,s,r,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},_d=new Oe,jv=new Oe,Aa=class i{constructor(e=[],t=[]){this.uuid=xn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,s=this.bones.length;n<s;n++)this.boneInverses.push(new Oe)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let n=new Oe;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,s=this.boneTexture;for(let r=0,a=e.length;r<a;r++){let o=e[r]?e[r].matrixWorld:jv;_d.multiplyMatrices(o,t[r]),_d.toArray(n,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new i(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new Ea(t,e,e,hn,vn);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,s=e.bones.length;n<s;n++){let r=e.bones[n],a=t[r];a===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",r),a=new ar),this.bones.push(a),this.boneInverses.push(new Oe().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.6,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let s=0,r=t.length;s<r;s++){let a=t[s];e.bones.push(a.uuid);let o=n[s];e.boneInverses.push(o.toArray())}return e}},Di=class extends vt{constructor(e,t,n,s=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},ss=new Oe,vd=new Oe,jr=[],xd=new Yt,Kv=new Oe,Ws=new gt,Xs=new rn,Ta=class extends gt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Di(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<n;s++)this.setMatrixAt(s,Kv)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Yt),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ss),xd.copy(e.boundingBox).applyMatrix4(ss),this.boundingBox.union(xd)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new rn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ss),Xs.copy(e.boundingSphere).applyMatrix4(ss),this.boundingSphere.union(Xs)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,s=this.morphTexture.source.data.data,r=n.length+1,a=e*r+1;for(let o=0;o<n.length;o++)n[o]=s[a+o]}raycast(e,t){let n=this.matrixWorld,s=this.count;if(Ws.geometry=this.geometry,Ws.material=this.material,Ws.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Xs.copy(this.boundingSphere),Xs.applyMatrix4(n),e.ray.intersectsSphere(Xs)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,ss),vd.multiplyMatrices(n,ss),Ws.matrixWorld=vd,Ws.raycast(e,jr);for(let a=0,o=jr.length;a<o;a++){let c=jr[a];c.instanceId=r,c.object=this,t.push(c)}jr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Di(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,s=n.length+1;this.morphTexture===null&&(this.morphTexture=new Ea(new Float32Array(s*this.count),s,this.count,Dl,vn));let r=this.morphTexture.source.data.data,a=0;for(let l=0;l<n.length;l++)a+=n[l];let o=this.geometry.morphTargetsRelative?1:1-a,c=s*e;r[c]=o,r.set(n,c+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}},or=class extends an{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ie(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Ra=new O,Ca=new O,bd=new Oe,qs=new oi,Kr=new rn,pc=new O,Md=new O,ws=class extends ut{constructor(e=new zt,t=new or){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)Ra.fromBufferAttribute(t,s-1),Ca.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=Ra.distanceTo(Ca);e.setAttribute("lineDistance",new ft(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Kr.copy(n.boundingSphere),Kr.applyMatrix4(s),Kr.radius+=r,e.ray.intersectsSphere(Kr)===!1)return;bd.copy(s).invert(),qs.copy(e.ray).applyMatrix4(bd);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=n.index,d=n.attributes.position;if(h!==null){let f=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let y=f,p=g-1;y<p;y+=l){let m=h.getX(y),_=h.getX(y+1),x=Zr(this,e,qs,c,m,_);x&&t.push(x)}if(this.isLineLoop){let y=h.getX(g-1),p=h.getX(f),m=Zr(this,e,qs,c,y,p);m&&t.push(m)}}else{let f=Math.max(0,a.start),g=Math.min(d.count,a.start+a.count);for(let y=f,p=g-1;y<p;y+=l){let m=Zr(this,e,qs,c,y,y+1);m&&t.push(m)}if(this.isLineLoop){let y=Zr(this,e,qs,c,g-1,f);y&&t.push(y)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};wd=new O,Sd=new O,Ia=class extends ws{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)wd.fromBufferAttribute(t,s),Sd.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+wd.distanceTo(Sd);e.setAttribute("lineDistance",new ft(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}},Pa=class extends ws{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}},cr=class extends an{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ie(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Ed=new Oe,yl=new oi,Jr=new rn,Qr=new O,La=class extends ut{constructor(e=new zt,t=new cr){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Jr.copy(n.boundingSphere),Jr.applyMatrix4(s),Jr.radius+=r,e.ray.intersectsSphere(Jr)===!1)return;Ed.copy(s).invert(),yl.copy(e.ray).applyMatrix4(Ed);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=n.index,u=n.attributes.position;if(l!==null){let d=Math.max(0,a.start),f=Math.min(l.count,a.start+a.count);for(let g=d,y=f;g<y;g++){let p=l.getX(g);Qr.fromBufferAttribute(u,p),Ad(Qr,p,c,s,e,t,this)}}else{let d=Math.max(0,a.start),f=Math.min(u.count,a.start+a.count);for(let g=d,y=f;g<y;g++)Qr.fromBufferAttribute(u,g),Ad(Qr,g,c,s,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};Na=class i extends zt{constructor(e=1,t=1,n=1,s=32,r=1,a=!1,o=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:s,heightSegments:r,openEnded:a,thetaStart:o,thetaLength:c};let l=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],f=[],g=0,y=[],p=n/2,m=0;_(),a===!1&&(e>0&&x(!0),t>0&&x(!1)),this.setIndex(h),this.setAttribute("position",new ft(u,3)),this.setAttribute("normal",new ft(d,3)),this.setAttribute("uv",new ft(f,2));function _(){let b=new O,C=new O,A=0,E=(t-e)/n;for(let N=0;N<=r;N++){let j=[],v=N/r,M=v*(t-e)+e;for(let L=0;L<=s;L++){let U=L/s,I=U*c+o,R=Math.sin(I),P=Math.cos(I);C.x=M*R,C.y=-v*n+p,C.z=M*P,u.push(C.x,C.y,C.z),b.set(R,E,P).normalize(),d.push(b.x,b.y,b.z),f.push(U,1-v),j.push(g++)}y.push(j)}for(let N=0;N<s;N++)for(let j=0;j<r;j++){let v=y[j][N],M=y[j+1][N],L=y[j+1][N+1],U=y[j][N+1];e>0&&(h.push(v,M,U),A+=3),t>0&&(h.push(M,L,U),A+=3)}l.addGroup(m,A,0),m+=A}function x(b){let C=g,A=new Te,E=new O,N=0,j=b===!0?e:t,v=b===!0?1:-1;for(let L=1;L<=s;L++)u.push(0,p*v,0),d.push(0,v,0),f.push(.5,.5),g++;let M=g;for(let L=0;L<=s;L++){let I=L/s*c+o,R=Math.cos(I),P=Math.sin(I);E.x=j*P,E.y=p*v,E.z=j*R,u.push(E.x,E.y,E.z),d.push(0,v,0),A.x=R*.5+.5,A.y=P*.5*v+.5,f.push(A.x,A.y),g++}for(let L=0;L<s;L++){let U=C+L,I=M+L;b===!0?h.push(I,I+1,U):h.push(I+1,I,U),N+=3}l.addGroup(m,N,b===!0?1:2),m+=N}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},Da=class i extends zt{constructor(e=.5,t=1,n=32,s=1,r=0,a=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:a},n=Math.max(3,n),s=Math.max(1,s);let o=[],c=[],l=[],h=[],u=e,d=(t-e)/s,f=new O,g=new Te;for(let y=0;y<=s;y++){for(let p=0;p<=n;p++){let m=r+p/n*a;f.x=u*Math.cos(m),f.y=u*Math.sin(m),c.push(f.x,f.y,f.z),l.push(0,0,1),g.x=(f.x/t+1)/2,g.y=(f.y/t+1)/2,h.push(g.x,g.y)}u+=d}for(let y=0;y<s;y++){let p=y*(n+1);for(let m=0;m<n;m++){let _=m+p,x=_,b=_+n+1,C=_+n+2,A=_+1;o.push(x,b,A),o.push(b,C,A)}}this.setIndex(o),this.setAttribute("position",new ft(c,3)),this.setAttribute("normal",new ft(l,3)),this.setAttribute("uv",new ft(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}},Ua=class i extends zt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let c=Math.min(a+o,Math.PI),l=0,h=[],u=new O,d=new O,f=[],g=[],y=[],p=[];for(let m=0;m<=n;m++){let _=[],x=m/n,b=0;m===0&&a===0?b=.5/t:m===n&&c===Math.PI&&(b=-.5/t);for(let C=0;C<=t;C++){let A=C/t;u.x=-e*Math.cos(s+A*r)*Math.sin(a+x*o),u.y=e*Math.cos(a+x*o),u.z=e*Math.sin(s+A*r)*Math.sin(a+x*o),g.push(u.x,u.y,u.z),d.copy(u).normalize(),y.push(d.x,d.y,d.z),p.push(A+b,1-x),_.push(l++)}h.push(_)}for(let m=0;m<n;m++)for(let _=0;_<t;_++){let x=h[m][_+1],b=h[m][_],C=h[m+1][_],A=h[m+1][_+1];(m!==0||a>0)&&f.push(x,b,A),(m!==n-1||c<Math.PI)&&f.push(b,C,A)}this.setIndex(f),this.setAttribute("position",new ft(g,3)),this.setAttribute("normal",new ft(y,3)),this.setAttribute("uv",new ft(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}},Ss=class extends an{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Ie(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ie(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Wd,this.normalScale=new Te(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Tn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},on=class extends Ss{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Te(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return It(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new Ie(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ie(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ie(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};ci=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];e:{t:{let a;n:{i:if(!(e<s)){for(let o=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=t[++n],e<s)break t}a=t.length;break n}if(!(e>=r)){let o=t[1];e<o&&(n=2,r=o);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=t[--n-1],e>=r)break t}a=n,n=0;break n}break e}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=n[r+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},_l=class extends ci{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:as,endingEnd:as}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,a=e+1,o=s[r],c=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case os:r=e,o=2*t-n;break;case oa:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case os:a=e,c=2*n-t;break;case oa:a=1,c=n+s[1]-s[0];break;default:a=e-1,c=t}let l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-t)/(s-t),y=g*g,p=y*g,m=-d*p+2*d*y-d*g,_=(1+d)*p+(-1.5-2*d)*y+(-.5+d)*g+1,x=(-1-f)*p+(1.5+f)*y+.5*g,b=f*p-f*y;for(let C=0;C!==o;++C)r[C]=m*a[h+C]+_*a[l+C]+x*a[c+C]+b*a[u+C];return r}},ka=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=(n-t)/(s-t),u=1-h;for(let d=0;d!==o;++d)r[d]=a[l+d]*u+a[c+d]*h;return r}},vl=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},un=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ea(t,this.TimeBufferType),this.values=ea(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ea(e.times,Array),values:ea(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new vl(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new ka(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new _l(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case _s:t=this.InterpolantFactoryMethodDiscrete;break;case vs:t=this.InterpolantFactoryMethodLinear;break;case Fo:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return _s;case this.InterpolantFactoryMethodLinear:return vs;case this.InterpolantFactoryMethodSmooth:return Fo}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<e;)++r;for(;a!==-1&&n[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(a!==null&&a>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,c,a),e=!1;break}a=c}if(s!==void 0&&Zv(s))for(let o=0,c=s.length;o!==c;++o){let l=s[o];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Fo,r=e.length-1,a=1;for(let o=1;o<r;++o){let c=!1,l=e[o],h=e[o+1];if(l!==h&&(o!==1||l!==e[0]))if(s)c=!0;else{let u=o*n,d=u-n,f=u+n;for(let g=0;g!==n;++g){let y=t[u+g];if(y!==t[d+g]||y!==t[f+g]){c=!0;break}}}if(c){if(o!==a){e[a]=e[o];let u=o*n,d=a*n;for(let f=0;f!==n;++f)t[d+f]=t[u+f]}++a}}if(r>0){e[a]=e[r];for(let o=r*n,c=a*n,l=0;l!==n;++l)t[c+l]=t[o+l];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};un.prototype.TimeBufferType=Float32Array;un.prototype.ValueBufferType=Float32Array;un.prototype.DefaultInterpolation=vs;li=class extends un{constructor(e,t,n){super(e,t,n)}};li.prototype.ValueTypeName="bool";li.prototype.ValueBufferType=Array;li.prototype.DefaultInterpolation=_s;li.prototype.InterpolantFactoryMethodLinear=void 0;li.prototype.InterpolantFactoryMethodSmooth=void 0;Oa=class extends un{};Oa.prototype.ValueTypeName="color";Gn=class extends un{};Gn.prototype.ValueTypeName="number";xl=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-t)/(s-t),l=e*o;for(let h=l+o;l!==h;l+=4)Pt.slerpFlat(r,0,a,l-o,a,l,c);return r}},Wn=class extends un{InterpolantFactoryMethodLinear(e){return new xl(this.times,this.values,this.getValueSize(),e)}};Wn.prototype.ValueTypeName="quaternion";Wn.prototype.InterpolantFactoryMethodSmooth=void 0;hi=class extends un{constructor(e,t,n){super(e,t,n)}};hi.prototype.ValueTypeName="string";hi.prototype.ValueBufferType=Array;hi.prototype.DefaultInterpolation=_s;hi.prototype.InterpolantFactoryMethodLinear=void 0;hi.prototype.InterpolantFactoryMethodSmooth=void 0;Xn=class extends un{};Xn.prototype.ValueTypeName="vector";Es=class{constructor(e="",t=-1,n=[],s=Fl){this.name=e,this.tracks=n,this.duration=t,this.blendMode=s,this.uuid=xn(),this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,s=1/(e.fps||1);for(let a=0,o=n.length;a!==o;++a)t.push(ex(n[a]).scale(s));let r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r}static toJSON(e){let t=[],n=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode};for(let r=0,a=n.length;r!==a;++r)t.push(un.toJSON(n[r]));return s}static CreateFromMorphTargetSequence(e,t,n,s){let r=t.length,a=[];for(let o=0;o<r;o++){let c=[],l=[];c.push((o+r-1)%r,o,(o+1)%r),l.push(0,1,0);let h=Jv(c);c=Td(c,1,h),l=Td(l,1,h),!s&&c[0]===0&&(c.push(r),l.push(l[0])),a.push(new Gn(".morphTargetInfluences["+t[o].name+"]",c,l).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let s=e;n=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<n.length;s++)if(n[s].name===t)return n[s];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let s={},r=/^([\w-]*?)([\d]+)$/;for(let o=0,c=e.length;o<c;o++){let l=e[o],h=l.name.match(r);if(h&&h.length>1){let u=h[1],d=s[u];d||(s[u]=d=[]),d.push(l)}}let a=[];for(let o in s)a.push(this.CreateFromMorphTargetSequence(o,s[o],t,n));return a}static parseAnimation(e,t){if(!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;let n=function(u,d,f,g,y){if(f.length!==0){let p=[],m=[];ef(f,p,m,g),p.length!==0&&y.push(new u(d,p,m))}},s=[],r=e.name||"default",a=e.fps||30,o=e.blendMode,c=e.length||-1,l=e.hierarchy||[];for(let u=0;u<l.length;u++){let d=l[u].keys;if(!(!d||d.length===0))if(d[0].morphTargets){let f={},g;for(g=0;g<d.length;g++)if(d[g].morphTargets)for(let y=0;y<d[g].morphTargets.length;y++)f[d[g].morphTargets[y]]=-1;for(let y in f){let p=[],m=[];for(let _=0;_!==d[g].morphTargets.length;++_){let x=d[g];p.push(x.time),m.push(x.morphTarget===y?1:0)}s.push(new Gn(".morphTargetInfluence["+y+"]",p,m))}c=f.length*a}else{let f=".bones["+t[u].name+"]";n(Xn,f+".position",d,"pos",s),n(Wn,f+".quaternion",d,"rot",s),n(Xn,f+".scale",d,"scl",s)}}return s.length===0?null:new this(r,c,s,o)}resetDuration(){let e=this.tracks,t=0;for(let n=0,s=e.length;n!==s;++n){let r=this.tracks[n];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());return new this.constructor(this.name,this.duration,e,this.blendMode)}toJSON(){return this.constructor.toJSON(this)}};si={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(this.files[i]=e)},get:function(i){if(this.enabled!==!1)return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}},bl=class{constructor(e,t,n){let s=this,r=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=l.length;u<d;u+=2){let f=l[u],g=l[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null}}},tx=new bl,qn=class{constructor(e){this.manager=e!==void 0?e:tx,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};qn.DEFAULT_MATERIAL_NAME="__DEFAULT";On={},Ml=class extends Error{constructor(e,t){super(e),this.response=t}},lr=class extends qn{constructor(e){super(e)}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=si.get(e);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(On[e]!==void 0){On[e].push({onLoad:t,onProgress:n,onError:s});return}On[e]=[],On[e].push({onLoad:t,onProgress:n,onError:s});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin"}),o=this.mimeType,c=this.responseType;fetch(a).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;let h=On[e],u=l.body.getReader(),d=l.headers.get("X-File-Size")||l.headers.get("Content-Length"),f=d?parseInt(d):0,g=f!==0,y=0,p=new ReadableStream({start(m){_();function _(){u.read().then(({done:x,value:b})=>{if(x)m.close();else{y+=b.byteLength;let C=new ProgressEvent("progress",{lengthComputable:g,loaded:y,total:f});for(let A=0,E=h.length;A<E;A++){let N=h[A];N.onProgress&&N.onProgress(C)}m.enqueue(b),_()}},x=>{m.error(x)})}}});return new Response(p)}else throw new Ml(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return l.json();default:if(o===void 0)return l.text();{let u=/charset="?([^;"\s]*)"?/i.exec(o),d=u&&u[1]?u[1].toLowerCase():void 0,f=new TextDecoder(d);return l.arrayBuffer().then(g=>f.decode(g))}}}).then(l=>{si.add(e,l);let h=On[e];delete On[e];for(let u=0,d=h.length;u<d;u++){let f=h[u];f.onLoad&&f.onLoad(l)}}).catch(l=>{let h=On[e];if(h===void 0)throw this.manager.itemError(e),l;delete On[e];for(let u=0,d=h.length;u<d;u++){let f=h[u];f.onError&&f.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}},wl=class extends qn{constructor(e){super(e)}load(e,t,n,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,a=si.get(e);if(a!==void 0)return r.manager.itemStart(e),setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0),a;let o=tr("img");function c(){h(),si.add(e,this),t&&t(this),r.manager.itemEnd(e)}function l(u){h(),s&&s(u),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),r.manager.itemStart(e),o.src=e,o}},Fa=class extends qn{constructor(e){super(e)}load(e,t,n,s){let r=new Lt,a=new wl(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){r.image=o,r.needsUpdate=!0,t!==void 0&&t(r)},n,s),r}},hr=class extends ut{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ie(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}},mc=new Oe,Rd=new O,Cd=new O,ur=class{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Te(512,512),this.map=null,this.mapPass=null,this.matrix=new Oe,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new ir,this._frameExtents=new Te(1,1),this._viewportCount=1,this._viewports=[new Ke(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;Rd.setFromMatrixPosition(e.matrixWorld),t.position.copy(Rd),Cd.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Cd),t.updateMatrixWorld(),mc.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(mc),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(mc)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Sl=class extends ur{constructor(){super(new _t(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1}updateMatrices(e){let t=this.camera,n=xs*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height,r=e.distance||t.far;(n!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=n,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Ba=class extends hr{constructor(e,t,n=0,s=Math.PI/3,r=0,a=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ut.DEFAULT_UP),this.updateMatrix(),this.target=new ut,this.distance=n,this.angle=s,this.penumbra=r,this.decay=a,this.map=null,this.shadow=new Sl}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Id=new Oe,Ys=new O,gc=new O,El=class extends ur{constructor(){super(new _t(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Te(4,2),this._viewportCount=6,this._viewports=[new Ke(2,1,1,1),new Ke(0,1,1,1),new Ke(3,1,1,1),new Ke(1,1,1,1),new Ke(3,0,1,1),new Ke(1,0,1,1)],this._cubeDirections=[new O(1,0,0),new O(-1,0,0),new O(0,0,1),new O(0,0,-1),new O(0,1,0),new O(0,-1,0)],this._cubeUps=[new O(0,1,0),new O(0,1,0),new O(0,1,0),new O(0,1,0),new O(0,0,1),new O(0,0,-1)]}updateMatrices(e,t=0){let n=this.camera,s=this.matrix,r=e.distance||n.far;r!==n.far&&(n.far=r,n.updateProjectionMatrix()),Ys.setFromMatrixPosition(e.matrixWorld),n.position.copy(Ys),gc.copy(n.position),gc.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(gc),n.updateMatrixWorld(),s.makeTranslation(-Ys.x,-Ys.y,-Ys.z),Id.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Id)}},za=class extends hr{constructor(e,t,n=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=s,this.shadow=new El}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},Al=class extends ur{constructor(){super(new Ms(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Ha=class extends hr{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ut.DEFAULT_UP),this.updateMatrix(),this.target=new ut,this.shadow=new Al}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},ui=class{static decodeText(e){if(console.warn("THREE.LoaderUtils: decodeText() has been deprecated with r165 and will be removed with r175. Use TextDecoder instead."),typeof TextDecoder<"u")return new TextDecoder().decode(e);let t="";for(let n=0,s=e.length;n<s;n++)t+=String.fromCharCode(e[n]);try{return decodeURIComponent(escape(t))}catch{return t}}static extractUrlBase(e){let t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}},Va=class extends qn{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"}}setOptions(e){return this.options=e,this}load(e,t,n,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,a=si.get(e);if(a!==void 0){if(r.manager.itemStart(e),a.then){a.then(l=>{t&&t(l),r.manager.itemEnd(e)}).catch(l=>{s&&s(l)});return}return setTimeout(function(){t&&t(a),r.manager.itemEnd(e)},0),a}let o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader;let c=fetch(e,o).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(l){return si.add(e,l),t&&t(l),r.manager.itemEnd(e),l}).catch(function(l){s&&s(l),si.remove(e),r.manager.itemError(e),r.manager.itemEnd(e)});si.add(e,c),r.manager.itemStart(e)}},Tl=class{constructor(e,t,n){this.binding=e,this.valueSize=n;let s,r,a;switch(t){case"quaternion":s=this._slerp,r=this._slerpAdditive,a=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":s=this._select,r=this._select,a=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:s=this._lerp,r=this._lerpAdditive,a=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=s,this._mixBufferRegionAdditive=r,this._setIdentity=a,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){let n=this.buffer,s=this.valueSize,r=e*s+s,a=this.cumulativeWeight;if(a===0){for(let o=0;o!==s;++o)n[r+o]=n[o];a=t}else{a+=t;let o=t/a;this._mixBufferRegion(n,r,0,o,s)}this.cumulativeWeight=a}accumulateAdditive(e){let t=this.buffer,n=this.valueSize,s=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,s,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){let t=this.valueSize,n=this.buffer,s=e*t+t,r=this.cumulativeWeight,a=this.cumulativeWeightAdditive,o=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,r<1){let c=t*this._origIndex;this._mixBufferRegion(n,s,c,1-r,t)}a>0&&this._mixBufferRegionAdditive(n,s,this._addIndex*t,1,t);for(let c=t,l=t+t;c!==l;++c)if(n[c]!==n[c+t]){o.setValue(n,s);break}}saveOriginalState(){let e=this.binding,t=this.buffer,n=this.valueSize,s=n*this._origIndex;e.getValue(t,s);for(let r=n,a=s;r!==a;++r)t[r]=t[s+r%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){let e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,s,r){if(s>=.5)for(let a=0;a!==r;++a)e[t+a]=e[n+a]}_slerp(e,t,n,s){Pt.slerpFlat(e,t,e,t,e,n,s)}_slerpAdditive(e,t,n,s,r){let a=this._workIndex*r;Pt.multiplyQuaternionsFlat(e,a,e,t,e,n),Pt.slerpFlat(e,t,e,t,e,a,s)}_lerp(e,t,n,s,r){let a=1-s;for(let o=0;o!==r;++o){let c=t+o;e[c]=e[c]*a+e[n+o]*s}}_lerpAdditive(e,t,n,s,r){for(let a=0;a!==r;++a){let o=t+a;e[o]=e[o]+e[n+a]*s}}},Vl="\\[\\]\\.:\\/",nx=new RegExp("["+Vl+"]","g"),Gl="[^"+Vl+"]",ix="[^"+Vl.replace("\\.","")+"]",sx=/((?:WC+[\/:])*)/.source.replace("WC",Gl),rx=/(WCOD+)?/.source.replace("WCOD",ix),ax=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Gl),ox=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Gl),cx=new RegExp("^"+sx+rx+ax+ox+"$"),lx=["material","materials","bones","map"],Rl=class{constructor(e,t,n){let s=n||st.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},st=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(nx,"")}static parseTrackName(e){let t=cx.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);lx.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===t||o.uuid===t)return o;let c=n(o.children);if(c)return c}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let a=e[s];if(a===void 0){let l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};st.Composite=Rl;st.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};st.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};st.prototype.GetterByBindingType=[st.prototype._getValue_direct,st.prototype._getValue_array,st.prototype._getValue_arrayElement,st.prototype._getValue_toArray];st.prototype.SetterByBindingTypeAndVersioning=[[st.prototype._setValue_direct,st.prototype._setValue_direct_setNeedsUpdate,st.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[st.prototype._setValue_array,st.prototype._setValue_array_setNeedsUpdate,st.prototype._setValue_array_setMatrixWorldNeedsUpdate],[st.prototype._setValue_arrayElement,st.prototype._setValue_arrayElement_setNeedsUpdate,st.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[st.prototype._setValue_fromArray,st.prototype._setValue_fromArray_setNeedsUpdate,st.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];Cl=class{constructor(e,t,n=null,s=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=s;let r=t.tracks,a=r.length,o=new Array(a),c={endingStart:as,endingEnd:as};for(let l=0;l!==a;++l){let h=r[l].createInterpolant(null);o[l]=h,h.settings=c}this._interpolantSettings=c,this._interpolants=o,this._propertyBindings=new Array(a),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=bm,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n){if(e.fadeOut(t),this.fadeIn(t),n){let s=this._clip.duration,r=e._clip.duration,a=r/s,o=s/r;e.warp(1,a,t),this.warp(o,1,t)}return this}crossFadeTo(e,t,n){return e.crossFadeFrom(this,t,n)}stopFading(){let e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){let s=this._mixer,r=s.time,a=this.timeScale,o=this._timeScaleInterpolant;o===null&&(o=s._lendControlInterpolant(),this._timeScaleInterpolant=o);let c=o.parameterPositions,l=o.sampleValues;return c[0]=r,c[1]=r+n,l[0]=e/a,l[1]=t/a,this}stopWarping(){let e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,s){if(!this.enabled){this._updateWeight(e);return}let r=this._startTime;if(r!==null){let c=(e-r)*n;c<0||n===0?t=0:(this._startTime=null,t=n*c)}t*=this._updateTimeScale(e);let a=this._updateTime(t),o=this._updateWeight(e);if(o>0){let c=this._interpolants,l=this._propertyBindings;switch(this.blendMode){case wm:for(let h=0,u=c.length;h!==u;++h)c[h].evaluate(a),l[h].accumulateAdditive(o);break;case Fl:default:for(let h=0,u=c.length;h!==u;++h)c[h].evaluate(a),l[h].accumulate(s,o)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;let n=this._weightInterpolant;if(n!==null){let s=n.evaluate(e)[0];t*=s,e>n.parameterPositions[1]&&(this.stopFading(),s===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let s=n.evaluate(e)[0];t*=s,e>n.parameterPositions[1]&&(this.stopWarping(),t===0?this.paused=!0:this.timeScale=t)}}return this._effectiveTimeScale=t,t}_updateTime(e){let t=this._clip.duration,n=this.loop,s=this.time+e,r=this._loopCount,a=n===Mm;if(e===0)return r===-1?s:a&&(r&1)===1?t-s:s;if(n===xm){r===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));e:{if(s>=t)s=t;else if(s<0)s=0;else{this.time=s;break e}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e<0?-1:1})}}else{if(r===-1&&(e>=0?(r=0,this._setEndings(!0,this.repetitions===0,a)):this._setEndings(this.repetitions===0,!0,a)),s>=t||s<0){let o=Math.floor(s/t);s-=t*o,r+=Math.abs(o);let c=this.repetitions-r;if(c<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,s=e>0?t:0,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e>0?1:-1});else{if(c===1){let l=e<0;this._setEndings(l,!l,a)}else this._setEndings(!1,!1,a);this._loopCount=r,this.time=s,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:o})}}else this.time=s;if(a&&(r&1)===1)return t-s}return s}_setEndings(e,t,n){let s=this._interpolantSettings;n?(s.endingStart=os,s.endingEnd=os):(e?s.endingStart=this.zeroSlopeAtStart?os:as:s.endingStart=oa,t?s.endingEnd=this.zeroSlopeAtEnd?os:as:s.endingEnd=oa)}_scheduleFading(e,t,n){let s=this._mixer,r=s.time,a=this._weightInterpolant;a===null&&(a=s._lendControlInterpolant(),this._weightInterpolant=a);let o=a.parameterPositions,c=a.sampleValues;return o[0]=r,c[0]=t,o[1]=r+e,c[1]=n,this}},hx=new Float32Array(1),Ga=class extends An{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction(e,t){let n=e._localRoot||this._root,s=e._clip.tracks,r=s.length,a=e._propertyBindings,o=e._interpolants,c=n.uuid,l=this._bindingsByRootAndName,h=l[c];h===void 0&&(h={},l[c]=h);for(let u=0;u!==r;++u){let d=s[u],f=d.name,g=h[f];if(g!==void 0)++g.referenceCount,a[u]=g;else{if(g=a[u],g!==void 0){g._cacheIndex===null&&(++g.referenceCount,this._addInactiveBinding(g,c,f));continue}let y=t&&t._propertyBindings[u].binding.parsedPath;g=new Tl(st.create(n,f,y),d.ValueTypeName,d.getValueSize()),++g.referenceCount,this._addInactiveBinding(g,c,f),a[u]=g}o[u].resultBuffer=g.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){let n=(e._localRoot||this._root).uuid,s=e._clip.uuid,r=this._actionsByClip[s];this._bindAction(e,r&&r.knownActions[0]),this._addInactiveAction(e,s,n)}let t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){let r=t[n];r.useCount++===0&&(this._lendBinding(r),r.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){let t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){let r=t[n];--r.useCount===0&&(r.restoreOriginalState(),this._takeBackBinding(r))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){let t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){let s=this._actions,r=this._actionsByClip,a=r[t];if(a===void 0)a={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,r[t]=a;else{let o=a.knownActions;e._byClipCacheIndex=o.length,o.push(e)}e._cacheIndex=s.length,s.push(e),a.actionByRoot[n]=e}_removeInactiveAction(e){let t=this._actions,n=t[t.length-1],s=e._cacheIndex;n._cacheIndex=s,t[s]=n,t.pop(),e._cacheIndex=null;let r=e._clip.uuid,a=this._actionsByClip,o=a[r],c=o.knownActions,l=c[c.length-1],h=e._byClipCacheIndex;l._byClipCacheIndex=h,c[h]=l,c.pop(),e._byClipCacheIndex=null;let u=o.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],c.length===0&&delete a[r],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){let t=e._propertyBindings;for(let n=0,s=t.length;n!==s;++n){let r=t[n];--r.referenceCount===0&&this._removeInactiveBinding(r)}}_lendAction(e){let t=this._actions,n=e._cacheIndex,s=this._nActiveActions++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_takeBackAction(e){let t=this._actions,n=e._cacheIndex,s=--this._nActiveActions,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_addInactiveBinding(e,t,n){let s=this._bindingsByRootAndName,r=this._bindings,a=s[t];a===void 0&&(a={},s[t]=a),a[n]=e,e._cacheIndex=r.length,r.push(e)}_removeInactiveBinding(e){let t=this._bindings,n=e.binding,s=n.rootNode.uuid,r=n.path,a=this._bindingsByRootAndName,o=a[s],c=t[t.length-1],l=e._cacheIndex;c._cacheIndex=l,t[l]=c,t.pop(),delete o[r],Object.keys(o).length===0&&delete a[s]}_lendBinding(e){let t=this._bindings,n=e._cacheIndex,s=this._nActiveBindings++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_takeBackBinding(e){let t=this._bindings,n=e._cacheIndex,s=--this._nActiveBindings,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=n,t[n]=r}_lendControlInterpolant(){let e=this._controlInterpolants,t=this._nActiveControlInterpolants++,n=e[t];return n===void 0&&(n=new ka(new Float32Array(2),new Float32Array(2),1,hx),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){let t=this._controlInterpolants,n=e.__cacheIndex,s=--this._nActiveControlInterpolants,r=t[s];e.__cacheIndex=s,t[s]=e,r.__cacheIndex=n,t[n]=r}clipAction(e,t,n){let s=t||this._root,r=s.uuid,a=typeof e=="string"?Es.findByName(s,e):e,o=a!==null?a.uuid:e,c=this._actionsByClip[o],l=null;if(n===void 0&&(a!==null?n=a.blendMode:n=Fl),c!==void 0){let u=c.actionByRoot[r];if(u!==void 0&&u.blendMode===n)return u;l=c.knownActions[0],a===null&&(a=l._clip)}if(a===null)return null;let h=new Cl(this,a,t,n);return this._bindAction(h,l),this._addInactiveAction(h,o,r),h}existingAction(e,t){let n=t||this._root,s=n.uuid,r=typeof e=="string"?Es.findByName(n,e):e,a=r?r.uuid:e,o=this._actionsByClip[a];return o!==void 0&&o.actionByRoot[s]||null}stopAllAction(){let e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;let t=this._actions,n=this._nActiveActions,s=this.time+=e,r=Math.sign(e),a=this._accuIndex^=1;for(let l=0;l!==n;++l)t[l]._update(s,e,r,a);let o=this._bindings,c=this._nActiveBindings;for(let l=0;l!==c;++l)o[l].apply(a);return this}setTime(e){this.time=0;for(let t=0;t<this._actions.length;t++)this._actions[t].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){let t=this._actions,n=e.uuid,s=this._actionsByClip,r=s[n];if(r!==void 0){let a=r.knownActions;for(let o=0,c=a.length;o!==c;++o){let l=a[o];this._deactivateAction(l);let h=l._cacheIndex,u=t[t.length-1];l._cacheIndex=null,l._byClipCacheIndex=null,u._cacheIndex=h,t[h]=u,t.pop(),this._removeInactiveBindingsForAction(l)}delete s[n]}}uncacheRoot(e){let t=e.uuid,n=this._actionsByClip;for(let a in n){let o=n[a].actionByRoot,c=o[t];c!==void 0&&(this._deactivateAction(c),this._removeInactiveAction(c))}let s=this._bindingsByRootAndName,r=s[t];if(r!==void 0)for(let a in r){let o=r[a];o.restoreOriginalState(),this._removeInactiveBinding(o)}}uncacheAction(e,t){let n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}},dr=class{constructor(e=1,t=0,n=0){return this.radius=e,this.phi=t,this.theta=n,this}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(It(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}},Wa=class extends An{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(){}disconnect(){}dispose(){}update(){}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"169"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="169")});function Wl(i,e){if(e===Gd)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),i;if(e===pr||e===qa){let t=i.getIndex();if(t===null){let a=[],o=i.getAttribute("position");if(o!==void 0){for(let c=0;c<o.count;c++)a.push(c);i.setIndex(a),t=i.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),i}let n=t.count-2,s=[];if(e===pr)for(let a=1;a<=n;a++)s.push(t.getX(0)),s.push(t.getX(a)),s.push(t.getX(a+1));else for(let a=0;a<n;a++)a%2===0?(s.push(t.getX(a)),s.push(t.getX(a+1)),s.push(t.getX(a+2))):(s.push(t.getX(a+2)),s.push(t.getX(a+1)),s.push(t.getX(a)));s.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let r=i.clone();return r.setIndex(s),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),i}var tf=lt(()=>{mr()});function dx(){let i={};return{get:function(e){return i[e]},add:function(e,t){i[e]=t},remove:function(e){delete i[e]},removeAll:function(){i={}}}}function mx(i){return i.DefaultMaterial===void 0&&(i.DefaultMaterial=new Ss({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:En})),i.DefaultMaterial}function Oi(i,e,t){for(let n in t.extensions)i[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function Yn(i,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(i.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function gx(i,e,t){let n=!1,s=!1,r=!1;for(let l=0,h=e.length;l<h;l++){let u=e[l];if(u.POSITION!==void 0&&(n=!0),u.NORMAL!==void 0&&(s=!0),u.COLOR_0!==void 0&&(r=!0),n&&s&&r)break}if(!n&&!s&&!r)return Promise.resolve(i);let a=[],o=[],c=[];for(let l=0,h=e.length;l<h;l++){let u=e[l];if(n){let d=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):i.attributes.position;a.push(d)}if(s){let d=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):i.attributes.normal;o.push(d)}if(r){let d=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):i.attributes.color;c.push(d)}}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c)]).then(function(l){let h=l[0],u=l[1],d=l[2];return n&&(i.morphAttributes.position=h),s&&(i.morphAttributes.normal=u),r&&(i.morphAttributes.color=d),i.morphTargetsRelative=!0,i})}function yx(i,e){if(i.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)i.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){let t=e.extras.targetNames;if(i.morphTargetInfluences.length===t.length){i.morphTargetDictionary={};for(let n=0,s=t.length;n<s;n++)i.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function _x(i){let e,t=i.extensions&&i.extensions[He.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+Yl(t.attributes):e=i.indices+":"+Yl(i.attributes)+":"+i.mode,i.targets!==void 0)for(let n=0,s=i.targets.length;n<s;n++)e+=":"+Yl(i.targets[n]);return e}function Yl(i){let e="",t=Object.keys(i).sort();for(let n=0,s=t.length;n<s;n++)e+=t[n]+":"+i[t[n]]+";";return e}function _h(i){switch(i){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function vx(i){return i.search(/\.jpe?g($|\?)/i)>0||i.search(/^data\:image\/jpeg/)===0?"image/jpeg":i.search(/\.webp($|\?)/i)>0||i.search(/^data\:image\/webp/)===0?"image/webp":"image/png"}function bx(i,e,t){let n=e.attributes,s=new Yt;if(n.POSITION!==void 0){let o=t.json.accessors[n.POSITION],c=o.min,l=o.max;if(c!==void 0&&l!==void 0){if(s.set(new O(c[0],c[1],c[2]),new O(l[0],l[1],l[2])),o.normalized){let h=_h(Rs[o.componentType]);s.min.multiplyScalar(h),s.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let r=e.targets;if(r!==void 0){let o=new O,c=new O;for(let l=0,h=r.length;l<h;l++){let u=r[l];if(u.POSITION!==void 0){let d=t.json.accessors[u.POSITION],f=d.min,g=d.max;if(f!==void 0&&g!==void 0){if(c.setX(Math.max(Math.abs(f[0]),Math.abs(g[0]))),c.setY(Math.max(Math.abs(f[1]),Math.abs(g[1]))),c.setZ(Math.max(Math.abs(f[2]),Math.abs(g[2]))),d.normalized){let y=_h(Rs[d.componentType]);c.multiplyScalar(y)}o.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}s.expandByVector(o)}i.boundingBox=s;let a=new rn;s.getCenter(a.center),a.radius=s.min.distanceTo(s.max)/2,i.boundingSphere=a}function af(i,e,t){let n=e.attributes,s=[];function r(a,o){return t.getDependency("accessor",a).then(function(c){i.setAttribute(o,c)})}for(let a in n){let o=yh[a]||a.toLowerCase();o in i.attributes||s.push(r(n[a],o))}if(e.indices!==void 0&&!i.index){let a=t.getDependency("accessor",e.indices).then(function(o){i.setIndex(o)});s.push(a)}return qe.workingColorSpace!==Et&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${qe.workingColorSpace}" not supported.`),Yn(i,e),bx(i,e,t),Promise.all(s).then(function(){return e.targets!==void 0?gx(i,e.targets,t):i})}var ja,He,$l,jl,Kl,Zl,Jl,Ql,eh,th,nh,ih,sh,rh,ah,oh,ch,lh,hh,uh,of,gr,nf,dh,fh,ph,mh,Ka,fx,gh,dn,Rs,sf,rf,Xl,yh,di,px,ql,xx,vh,cf=lt(()=>{mr();tf();ja=class extends qn{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new Zl(t)}),this.register(function(t){return new Jl(t)}),this.register(function(t){return new oh(t)}),this.register(function(t){return new ch(t)}),this.register(function(t){return new lh(t)}),this.register(function(t){return new eh(t)}),this.register(function(t){return new th(t)}),this.register(function(t){return new nh(t)}),this.register(function(t){return new ih(t)}),this.register(function(t){return new Kl(t)}),this.register(function(t){return new sh(t)}),this.register(function(t){return new Ql(t)}),this.register(function(t){return new ah(t)}),this.register(function(t){return new rh(t)}),this.register(function(t){return new $l(t)}),this.register(function(t){return new hh(t)}),this.register(function(t){return new uh(t)})}load(e,t,n,s){let r=this,a;if(this.resourcePath!=="")a=this.resourcePath;else if(this.path!==""){let l=ui.extractUrlBase(e);a=ui.resolveURL(l,this.path)}else a=ui.extractUrlBase(e);this.manager.itemStart(e);let o=function(l){s?s(l):console.error(l),r.manager.itemError(e),r.manager.itemEnd(e)},c=new lr(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{r.parse(l,a,function(h){t(h),r.manager.itemEnd(e)},o)}catch(h){o(h)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,s){let r,a={},o={},c=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===of){try{a[He.KHR_BINARY_GLTF]=new dh(e)}catch(u){s&&s(u);return}r=JSON.parse(a[He.KHR_BINARY_GLTF].content)}else r=JSON.parse(c.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){s&&s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let l=new vh(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){let u=this.pluginCallbacks[h](l);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),o[u.name]=u,a[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){let u=r.extensionsUsed[h],d=r.extensionsRequired||[];switch(u){case He.KHR_MATERIALS_UNLIT:a[u]=new jl;break;case He.KHR_DRACO_MESH_COMPRESSION:a[u]=new fh(r,this.dracoLoader);break;case He.KHR_TEXTURE_TRANSFORM:a[u]=new ph;break;case He.KHR_MESH_QUANTIZATION:a[u]=new mh;break;default:d.indexOf(u)>=0&&o[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}l.setExtensions(a),l.setPlugins(o),l.parse(n,s)}parseAsync(e,t){let n=this;return new Promise(function(s,r){n.parse(e,t,s,r)})}};He={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"},$l=class{constructor(e){this.parser=e,this.name=He.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,s=t.length;n<s;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n="light:"+e,s=t.cache.get(n);if(s)return s;let r=t.json,c=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e],l,h=new Ie(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],Et);let u=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new Ha(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new za(h),l.distance=u;break;case"spot":l=new Ba(h),l.distance=u,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),l.decay=2,Yn(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),s=Promise.resolve(l),t.cache.add(n,s),s}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],o=(r.extensions&&r.extensions[this.name]||{}).light;return o===void 0?null:this._loadLight(o).then(function(c){return n._getNodeRef(t.cache,o,c)})}},jl=class{constructor(){this.name=He.KHR_MATERIALS_UNLIT}getMaterialType(){return $t}extendParams(e,t,n){let s=[];e.color=new Ie(1,1,1),e.opacity=1;let r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){let a=r.baseColorFactor;e.color.setRGB(a[0],a[1],a[2],Et),e.opacity=a[3]}r.baseColorTexture!==void 0&&s.push(n.assignTexture(e,"map",r.baseColorTexture,Ut))}return Promise.all(s)}},Kl=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name].emissiveStrength;return r!==void 0&&(t.emissiveIntensity=r),Promise.resolve()}},Zl=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];if(a.clearcoatFactor!==void 0&&(t.clearcoat=a.clearcoatFactor),a.clearcoatTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatMap",a.clearcoatTexture)),a.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=a.clearcoatRoughnessFactor),a.clearcoatRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"clearcoatRoughnessMap",a.clearcoatRoughnessTexture)),a.clearcoatNormalTexture!==void 0&&(r.push(n.assignTexture(t,"clearcoatNormalMap",a.clearcoatNormalTexture)),a.clearcoatNormalTexture.scale!==void 0)){let o=a.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new Te(o,o)}return Promise.all(r)}},Jl=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_DISPERSION}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name];return t.dispersion=r.dispersion!==void 0?r.dispersion:0,Promise.resolve()}},Ql=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return a.iridescenceFactor!==void 0&&(t.iridescence=a.iridescenceFactor),a.iridescenceTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceMap",a.iridescenceTexture)),a.iridescenceIor!==void 0&&(t.iridescenceIOR=a.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),a.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=a.iridescenceThicknessMinimum),a.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=a.iridescenceThicknessMaximum),a.iridescenceThicknessTexture!==void 0&&r.push(n.assignTexture(t,"iridescenceThicknessMap",a.iridescenceThicknessTexture)),Promise.all(r)}},eh=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_SHEEN}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[];t.sheenColor=new Ie(0,0,0),t.sheenRoughness=0,t.sheen=1;let a=s.extensions[this.name];if(a.sheenColorFactor!==void 0){let o=a.sheenColorFactor;t.sheenColor.setRGB(o[0],o[1],o[2],Et)}return a.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=a.sheenRoughnessFactor),a.sheenColorTexture!==void 0&&r.push(n.assignTexture(t,"sheenColorMap",a.sheenColorTexture,Ut)),a.sheenRoughnessTexture!==void 0&&r.push(n.assignTexture(t,"sheenRoughnessMap",a.sheenRoughnessTexture)),Promise.all(r)}},th=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return a.transmissionFactor!==void 0&&(t.transmission=a.transmissionFactor),a.transmissionTexture!==void 0&&r.push(n.assignTexture(t,"transmissionMap",a.transmissionTexture)),Promise.all(r)}},nh=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_VOLUME}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];t.thickness=a.thicknessFactor!==void 0?a.thicknessFactor:0,a.thicknessTexture!==void 0&&r.push(n.assignTexture(t,"thicknessMap",a.thicknessTexture)),t.attenuationDistance=a.attenuationDistance||1/0;let o=a.attenuationColor||[1,1,1];return t.attenuationColor=new Ie().setRGB(o[0],o[1],o[2],Et),Promise.all(r)}},ih=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_IOR}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name];return t.ior=r.ior!==void 0?r.ior:1.5,Promise.resolve()}},sh=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_SPECULAR}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];t.specularIntensity=a.specularFactor!==void 0?a.specularFactor:1,a.specularTexture!==void 0&&r.push(n.assignTexture(t,"specularIntensityMap",a.specularTexture));let o=a.specularColorFactor||[1,1,1];return t.specularColor=new Ie().setRGB(o[0],o[1],o[2],Et),a.specularColorTexture!==void 0&&r.push(n.assignTexture(t,"specularColorMap",a.specularColorTexture,Ut)),Promise.all(r)}},rh=class{constructor(e){this.parser=e,this.name=He.EXT_MATERIALS_BUMP}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return t.bumpScale=a.bumpFactor!==void 0?a.bumpFactor:1,a.bumpTexture!==void 0&&r.push(n.assignTexture(t,"bumpMap",a.bumpTexture)),Promise.all(r)}},ah=class{constructor(e){this.parser=e,this.name=He.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){let n=this.parser.json.materials[e];return!n.extensions||!n.extensions[this.name]?null:on}extendMaterialParams(e,t){let n=this.parser,s=n.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],a=s.extensions[this.name];return a.anisotropyStrength!==void 0&&(t.anisotropy=a.anisotropyStrength),a.anisotropyRotation!==void 0&&(t.anisotropyRotation=a.anisotropyRotation),a.anisotropyTexture!==void 0&&r.push(n.assignTexture(t,"anisotropyMap",a.anisotropyTexture)),Promise.all(r)}},oh=class{constructor(e){this.parser=e,this.name=He.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,s=n.textures[e];if(!s.extensions||!s.extensions[this.name])return null;let r=s.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,a)}},ch=class{constructor(e){this.parser=e,this.name=He.EXT_TEXTURE_WEBP,this.isSupported=null}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let a=r.extensions[t],o=s.images[a.source],c=n.textureLoader;if(o.uri){let l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return this.detectSupport().then(function(l){if(l)return n.loadTextureImage(e,a.source,c);if(s.extensionsRequired&&s.extensionsRequired.indexOf(t)>=0)throw new Error("THREE.GLTFLoader: WebP required by asset but unsupported.");return n.loadTexture(e)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(e){let t=new Image;t.src="data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",t.onload=t.onerror=function(){e(t.height===1)}})),this.isSupported}},lh=class{constructor(e){this.parser=e,this.name=He.EXT_TEXTURE_AVIF,this.isSupported=null}loadTexture(e){let t=this.name,n=this.parser,s=n.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let a=r.extensions[t],o=s.images[a.source],c=n.textureLoader;if(o.uri){let l=n.options.manager.getHandler(o.uri);l!==null&&(c=l)}return this.detectSupport().then(function(l){if(l)return n.loadTextureImage(e,a.source,c);if(s.extensionsRequired&&s.extensionsRequired.indexOf(t)>=0)throw new Error("THREE.GLTFLoader: AVIF required by asset but unsupported.");return n.loadTexture(e)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(e){let t=new Image;t.src="data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=",t.onload=t.onerror=function(){e(t.height===1)}})),this.isSupported}},hh=class{constructor(e){this.name=He.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let s=n.extensions[this.name],r=this.parser.getDependency("buffer",s.buffer),a=this.parser.options.meshoptDecoder;if(!a||!a.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(o){let c=s.byteOffset||0,l=s.byteLength||0,h=s.count,u=s.byteStride,d=new Uint8Array(o,c,l);return a.decodeGltfBufferAsync?a.decodeGltfBufferAsync(h,u,d,s.mode,s.filter).then(function(f){return f.buffer}):a.ready.then(function(){let f=new ArrayBuffer(h*u);return a.decodeGltfBuffer(new Uint8Array(f),h,u,d,s.mode,s.filter),f})})}else return null}},uh=class{constructor(e){this.name=He.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let s=t.meshes[n.mesh];for(let l of s.primitives)if(l.mode!==dn.TRIANGLES&&l.mode!==dn.TRIANGLE_STRIP&&l.mode!==dn.TRIANGLE_FAN&&l.mode!==void 0)return null;let a=n.extensions[this.name].attributes,o=[],c={};for(let l in a)o.push(this.parser.getDependency("accessor",a[l]).then(h=>(c[l]=h,c[l])));return o.length<1?null:(o.push(this.parser.createNodeMesh(e)),Promise.all(o).then(l=>{let h=l.pop(),u=h.isGroup?h.children:[h],d=l[0].count,f=[];for(let g of u){let y=new Oe,p=new O,m=new Pt,_=new O(1,1,1),x=new Ta(g.geometry,g.material,d);for(let b=0;b<d;b++)c.TRANSLATION&&p.fromBufferAttribute(c.TRANSLATION,b),c.ROTATION&&m.fromBufferAttribute(c.ROTATION,b),c.SCALE&&_.fromBufferAttribute(c.SCALE,b),x.setMatrixAt(b,y.compose(p,m,_));for(let b in c)if(b==="_COLOR_0"){let C=c[b];x.instanceColor=new Di(C.array,C.itemSize,C.normalized)}else b!=="TRANSLATION"&&b!=="ROTATION"&&b!=="SCALE"&&g.geometry.setAttribute(b,c[b]);ut.prototype.copy.call(x,g),this.parser.assignFinalMaterial(x),f.push(x)}return h.isGroup?(h.clear(),h.add(...f),h):f[0]}))}},of="glTF",gr=12,nf={JSON:1313821514,BIN:5130562},dh=class{constructor(e){this.name=He.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,gr),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==of)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");let s=this.header.length-gr,r=new DataView(e,gr),a=0;for(;a<s;){let o=r.getUint32(a,!0);a+=4;let c=r.getUint32(a,!0);if(a+=4,c===nf.JSON){let l=new Uint8Array(e,gr+a,o);this.content=n.decode(l)}else if(c===nf.BIN){let l=gr+a;this.body=e.slice(l,l+o)}a+=o}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}},fh=class{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=He.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,s=this.dracoLoader,r=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},c={},l={};for(let h in a){let u=yh[h]||h.toLowerCase();o[u]=a[h]}for(let h in e.attributes){let u=yh[h]||h.toLowerCase();if(a[h]!==void 0){let d=n.accessors[e.attributes[h]],f=Rs[d.componentType];l[u]=f.name,c[u]=d.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,d){s.decodeDracoFile(h,function(f){for(let g in f.attributes){let y=f.attributes[g],p=c[g];p!==void 0&&(y.normalized=p)}u(f)},o,l,Et,d)})})}},ph=class{constructor(){this.name=He.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}},mh=class{constructor(){this.name=He.KHR_MESH_QUANTIZATION}},Ka=class extends ci{constructor(e,t,n,s){super(e,t,n,s)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s*3+s;for(let a=0;a!==s;a++)t[a]=n[r+a];return t}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=o*2,l=o*3,h=s-t,u=(n-t)/h,d=u*u,f=d*u,g=e*l,y=g-l,p=-2*f+3*d,m=f-d,_=1-p,x=m-d+u;for(let b=0;b!==o;b++){let C=a[y+b+o],A=a[y+b+c]*h,E=a[g+b+o],N=a[g+b]*h;r[b]=_*C+x*A+p*E+m*N}return r}},fx=new Pt,gh=class extends Ka{interpolate_(e,t,n,s){let r=super.interpolate_(e,t,n,s);return fx.fromArray(r).normalize().toArray(r),r}},dn={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},Rs={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},sf={9728:kt,9729:Xt,9984:Il,9985:js,9986:rs,9987:Sn},rf={33071:Bn,33648:Qs,10497:Li},Xl={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},yh={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},di={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},px={CUBICSPLINE:void 0,LINEAR:vs,STEP:_s},ql={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};xx=new Oe,vh=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new dx,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,s=-1,r=!1,a=-1;if(typeof navigator<"u"){let o=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(o)===!0;let c=o.match(/Version\/(\d+)/);s=n&&c?parseInt(c[1],10):-1,r=o.indexOf("Firefox")>-1,a=r?o.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&s<17||r&&a<98?this.textureLoader=new Fa(this.options.manager):this.textureLoader=new Va(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new lr(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,s=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(a){return a._markDefs&&a._markDefs()}),Promise.all(this._invokeAll(function(a){return a.beforeRoot&&a.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(a){let o={scene:a[0][s.scene||0],scenes:a[0],animations:a[1],cameras:a[2],asset:s.asset,parser:n,userData:{}};return Oi(r,o,s),Yn(o,s),Promise.all(n._invokeAll(function(c){return c.afterRoot&&c.afterRoot(o)})).then(function(){for(let c of o.scenes)c.updateMatrixWorld();e(o)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let s=0,r=t.length;s<r;s++){let a=t[s].joints;for(let o=0,c=a.length;o<c;o++)e[a[o]].isBone=!0}for(let s=0,r=e.length;s<r;s++){let a=e[s];a.mesh!==void 0&&(this._addNodeRef(this.meshCache,a.mesh),a.skin!==void 0&&(n[a.mesh].isSkinnedMesh=!0)),a.camera!==void 0&&this._addNodeRef(this.cameraCache,a.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let s=n.clone(),r=(a,o)=>{let c=this.associations.get(a);c!=null&&this.associations.set(o,c);for(let[l,h]of a.children.entries())r(h,o.children[l])};return r(n,s),s.name+="_instance_"+e.uses[t]++,s}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let s=e(t[n]);if(s)return s}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let s=0;s<t.length;s++){let r=e(t[s]);r&&n.push(r)}return n}getDependency(e,t){let n=e+":"+t,s=this.cache.get(n);if(!s){switch(e){case"scene":s=this.loadScene(t);break;case"node":s=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":s=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":s=this.loadAccessor(t);break;case"bufferView":s=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":s=this.loadBuffer(t);break;case"material":s=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":s=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":s=this.loadSkin(t);break;case"animation":s=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":s=this.loadCamera(t);break;default:if(s=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!s)throw new Error("Unknown type: "+e);break}this.cache.add(n,s)}return s}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,s=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(s.map(function(r,a){return n.getDependency(e,a)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[He.KHR_BINARY_GLTF].body);let s=this.options;return new Promise(function(r,a){n.load(ui.resolveURL(t.uri,s.path),r,void 0,function(){a(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){let s=t.byteLength||0,r=t.byteOffset||0;return n.slice(r,r+s)})}loadAccessor(e){let t=this,n=this.json,s=this.json.accessors[e];if(s.bufferView===void 0&&s.sparse===void 0){let a=Xl[s.type],o=Rs[s.componentType],c=s.normalized===!0,l=new o(s.count*a);return Promise.resolve(new vt(l,a,c))}let r=[];return s.bufferView!==void 0?r.push(this.getDependency("bufferView",s.bufferView)):r.push(null),s.sparse!==void 0&&(r.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(r).then(function(a){let o=a[0],c=Xl[s.type],l=Rs[s.componentType],h=l.BYTES_PER_ELEMENT,u=h*c,d=s.byteOffset||0,f=s.bufferView!==void 0?n.bufferViews[s.bufferView].byteStride:void 0,g=s.normalized===!0,y,p;if(f&&f!==u){let m=Math.floor(d/f),_="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+m+":"+s.count,x=t.cache.get(_);x||(y=new l(o,m*f,s.count*f/h),x=new sr(y,f/h),t.cache.add(_,x)),p=new rr(x,c,d%f/h,g)}else o===null?y=new l(s.count*c):y=new l(o,d,s.count*c),p=new vt(y,c,g);if(s.sparse!==void 0){let m=Xl.SCALAR,_=Rs[s.sparse.indices.componentType],x=s.sparse.indices.byteOffset||0,b=s.sparse.values.byteOffset||0,C=new _(a[1],x,s.sparse.count*m),A=new l(a[2],b,s.sparse.count*c);o!==null&&(p=new vt(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let E=0,N=C.length;E<N;E++){let j=C[E];if(p.setX(j,A[E*c]),c>=2&&p.setY(j,A[E*c+1]),c>=3&&p.setZ(j,A[E*c+2]),c>=4&&p.setW(j,A[E*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}p.normalized=g}return p})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,a=t.images[r],o=this.textureLoader;if(a.uri){let c=n.manager.getHandler(a.uri);c!==null&&(o=c)}return this.loadTextureImage(e,r,o)}loadTextureImage(e,t,n){let s=this,r=this.json,a=r.textures[e],o=r.images[t],c=(o.uri||o.bufferView)+":"+a.sampler;if(this.textureCache[c])return this.textureCache[c];let l=this.loadImageSource(t,n).then(function(h){h.flipY=!1,h.name=a.name||o.name||"",h.name===""&&typeof o.uri=="string"&&o.uri.startsWith("data:image/")===!1&&(h.name=o.uri);let d=(r.samplers||{})[a.sampler]||{};return h.magFilter=sf[d.magFilter]||Xt,h.minFilter=sf[d.minFilter]||Sn,h.wrapS=rf[d.wrapS]||Li,h.wrapT=rf[d.wrapT]||Li,s.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){let n=this,s=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());let a=s.images[e],o=self.URL||self.webkitURL,c=a.uri||"",l=!1;if(a.bufferView!==void 0)c=n.getDependency("bufferView",a.bufferView).then(function(u){l=!0;let d=new Blob([u],{type:a.mimeType});return c=o.createObjectURL(d),c});else if(a.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");let h=Promise.resolve(c).then(function(u){return new Promise(function(d,f){let g=d;t.isImageBitmapLoader===!0&&(g=function(y){let p=new Lt(y);p.needsUpdate=!0,d(p)}),t.load(ui.resolveURL(u,r.path),g,void 0,f)})}).then(function(u){return l===!0&&o.revokeObjectURL(c),Yn(u,a),u.userData.mimeType=a.mimeType||vx(a.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=h,h}assignTexture(e,t,n,s){let r=this;return this.getDependency("texture",n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),r.extensions[He.KHR_TEXTURE_TRANSFORM]){let o=n.extensions!==void 0?n.extensions[He.KHR_TEXTURE_TRANSFORM]:void 0;if(o){let c=r.associations.get(a);a=r.extensions[He.KHR_TEXTURE_TRANSFORM].extendTexture(a,o),r.associations.set(a,c)}}return s!==void 0&&(a.colorSpace=s),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,n=e.material,s=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){let o="PointsMaterial:"+n.uuid,c=this.cache.get(o);c||(c=new cr,an.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,c.sizeAttenuation=!1,this.cache.add(o,c)),n=c}else if(e.isLine){let o="LineBasicMaterial:"+n.uuid,c=this.cache.get(o);c||(c=new or,an.prototype.copy.call(c,n),c.color.copy(n.color),c.map=n.map,this.cache.add(o,c)),n=c}if(s||r||a){let o="ClonedMaterial:"+n.uuid+":";s&&(o+="derivative-tangents:"),r&&(o+="vertex-colors:"),a&&(o+="flat-shading:");let c=this.cache.get(o);c||(c=n.clone(),r&&(c.vertexColors=!0),a&&(c.flatShading=!0),s&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(o,c),this.associations.set(c,this.associations.get(n))),n=c}e.material=n}getMaterialType(){return Ss}loadMaterial(e){let t=this,n=this.json,s=this.extensions,r=n.materials[e],a,o={},c=r.extensions||{},l=[];if(c[He.KHR_MATERIALS_UNLIT]){let u=s[He.KHR_MATERIALS_UNLIT];a=u.getMaterialType(),l.push(u.extendParams(o,r,t))}else{let u=r.pbrMetallicRoughness||{};if(o.color=new Ie(1,1,1),o.opacity=1,Array.isArray(u.baseColorFactor)){let d=u.baseColorFactor;o.color.setRGB(d[0],d[1],d[2],Et),o.opacity=d[3]}u.baseColorTexture!==void 0&&l.push(t.assignTexture(o,"map",u.baseColorTexture,Ut)),o.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,o.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(o,"metalnessMap",u.metallicRoughnessTexture)),l.push(t.assignTexture(o,"roughnessMap",u.metallicRoughnessTexture))),a=this._invokeOne(function(d){return d.getMaterialType&&d.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(d){return d.extendMaterialParams&&d.extendMaterialParams(e,o)})))}r.doubleSided===!0&&(o.side=sn);let h=r.alphaMode||ql.OPAQUE;if(h===ql.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,h===ql.MASK&&(o.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&a!==$t&&(l.push(t.assignTexture(o,"normalMap",r.normalTexture)),o.normalScale=new Te(1,1),r.normalTexture.scale!==void 0)){let u=r.normalTexture.scale;o.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&a!==$t&&(l.push(t.assignTexture(o,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&a!==$t){let u=r.emissiveFactor;o.emissive=new Ie().setRGB(u[0],u[1],u[2],Et)}return r.emissiveTexture!==void 0&&a!==$t&&l.push(t.assignTexture(o,"emissiveMap",r.emissiveTexture,Ut)),Promise.all(l).then(function(){let u=new a(o);return r.name&&(u.name=r.name),Yn(u,r),t.associations.set(u,{materials:e}),r.extensions&&Oi(s,u,r),u})}createUniqueName(e){let t=st.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,s=this.primitiveCache;function r(o){return n[He.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(o,t).then(function(c){return af(c,o,t)})}let a=[];for(let o=0,c=e.length;o<c;o++){let l=e[o],h=_x(l),u=s[h];if(u)a.push(u.promise);else{let d;l.extensions&&l.extensions[He.KHR_DRACO_MESH_COMPRESSION]?d=r(l):d=af(new zt,l,t),s[h]={primitive:l,promise:d},a.push(d)}}return Promise.all(a)}loadMesh(e){let t=this,n=this.json,s=this.extensions,r=n.meshes[e],a=r.primitives,o=[];for(let c=0,l=a.length;c<l;c++){let h=a[c].material===void 0?mx(this.cache):this.getDependency("material",a[c].material);o.push(h)}return o.push(t.loadGeometries(a)),Promise.all(o).then(function(c){let l=c.slice(0,c.length-1),h=c[c.length-1],u=[];for(let f=0,g=h.length;f<g;f++){let y=h[f],p=a[f],m,_=l[f];if(p.mode===dn.TRIANGLES||p.mode===dn.TRIANGLE_STRIP||p.mode===dn.TRIANGLE_FAN||p.mode===void 0)m=r.isSkinnedMesh===!0?new Sa(y,_):new gt(y,_),m.isSkinnedMesh===!0&&m.normalizeSkinWeights(),p.mode===dn.TRIANGLE_STRIP?m.geometry=Wl(m.geometry,qa):p.mode===dn.TRIANGLE_FAN&&(m.geometry=Wl(m.geometry,pr));else if(p.mode===dn.LINES)m=new Ia(y,_);else if(p.mode===dn.LINE_STRIP)m=new ws(y,_);else if(p.mode===dn.LINE_LOOP)m=new Pa(y,_);else if(p.mode===dn.POINTS)m=new La(y,_);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+p.mode);Object.keys(m.geometry.morphAttributes).length>0&&yx(m,r),m.name=t.createUniqueName(r.name||"mesh_"+e),Yn(m,r),p.extensions&&Oi(s,m,p),t.assignFinalMaterial(m),u.push(m)}for(let f=0,g=u.length;f<g;f++)t.associations.set(u[f],{meshes:e,primitives:f});if(u.length===1)return r.extensions&&Oi(s,u[0],r),u[0];let d=new Bt;r.extensions&&Oi(s,d,r),t.associations.set(d,{meshes:e});for(let f=0,g=u.length;f<g;f++)d.add(u[f]);return d})}loadCamera(e){let t,n=this.json.cameras[e],s=n[n.type];if(!s){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new _t(As.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):n.type==="orthographic"&&(t=new Ms(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),Yn(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let s=0,r=t.joints.length;s<r;s++)n.push(this._loadNodeShallow(t.joints[s]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(s){let r=s.pop(),a=s,o=[],c=[];for(let l=0,h=a.length;l<h;l++){let u=a[l];if(u){o.push(u);let d=new Oe;r!==null&&d.fromArray(r.array,l*16),c.push(d)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Aa(o,c)})}loadAnimation(e){let t=this.json,n=this,s=t.animations[e],r=s.name?s.name:"animation_"+e,a=[],o=[],c=[],l=[],h=[];for(let u=0,d=s.channels.length;u<d;u++){let f=s.channels[u],g=s.samplers[f.sampler],y=f.target,p=y.node,m=s.parameters!==void 0?s.parameters[g.input]:g.input,_=s.parameters!==void 0?s.parameters[g.output]:g.output;y.node!==void 0&&(a.push(this.getDependency("node",p)),o.push(this.getDependency("accessor",m)),c.push(this.getDependency("accessor",_)),l.push(g),h.push(y))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(u){let d=u[0],f=u[1],g=u[2],y=u[3],p=u[4],m=[];for(let _=0,x=d.length;_<x;_++){let b=d[_],C=f[_],A=g[_],E=y[_],N=p[_];if(b===void 0)continue;b.updateMatrix&&b.updateMatrix();let j=n._createAnimationTracks(b,C,A,E,N);if(j)for(let v=0;v<j.length;v++)m.push(j[v])}return new Es(r,void 0,m)})}createNodeMesh(e){let t=this.json,n=this,s=t.nodes[e];return s.mesh===void 0?null:n.getDependency("mesh",s.mesh).then(function(r){let a=n._getNodeRef(n.meshCache,s.mesh,r);return s.weights!==void 0&&a.traverse(function(o){if(o.isMesh)for(let c=0,l=s.weights.length;c<l;c++)o.morphTargetInfluences[c]=s.weights[c]}),a})}loadNode(e){let t=this.json,n=this,s=t.nodes[e],r=n._loadNodeShallow(e),a=[],o=s.children||[];for(let l=0,h=o.length;l<h;l++)a.push(n.getDependency("node",o[l]));let c=s.skin===void 0?Promise.resolve(null):n.getDependency("skin",s.skin);return Promise.all([r,Promise.all(a),c]).then(function(l){let h=l[0],u=l[1],d=l[2];d!==null&&h.traverse(function(f){f.isSkinnedMesh&&f.bind(d,xx)});for(let f=0,g=u.length;f<g;f++)h.add(u[f]);return h})}_loadNodeShallow(e){let t=this.json,n=this.extensions,s=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let r=t.nodes[e],a=r.name?s.createUniqueName(r.name):"",o=[],c=s._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&o.push(c),r.camera!==void 0&&o.push(s.getDependency("camera",r.camera).then(function(l){return s._getNodeRef(s.cameraCache,r.camera,l)})),s._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){o.push(l)}),this.nodeCache[e]=Promise.all(o).then(function(l){let h;if(r.isBone===!0?h=new ar:l.length>1?h=new Bt:l.length===1?h=l[0]:h=new ut,h!==l[0])for(let u=0,d=l.length;u<d;u++)h.add(l[u]);if(r.name&&(h.userData.name=r.name,h.name=a),Yn(h,r),r.extensions&&Oi(n,h,r),r.matrix!==void 0){let u=new Oe;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);return s.associations.has(h)||s.associations.set(h,{}),s.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],s=this,r=new Bt;n.name&&(r.name=s.createUniqueName(n.name)),Yn(r,n),n.extensions&&Oi(t,r,n);let a=n.nodes||[],o=[];for(let c=0,l=a.length;c<l;c++)o.push(s.getDependency("node",a[c]));return Promise.all(o).then(function(c){for(let h=0,u=c.length;h<u;h++)r.add(c[h]);let l=h=>{let u=new Map;for(let[d,f]of s.associations)(d instanceof an||d instanceof Lt)&&u.set(d,f);return h.traverse(d=>{let f=s.associations.get(d);f!=null&&u.set(d,f)}),u};return s.associations=l(r),r})}_createAnimationTracks(e,t,n,s,r){let a=[],o=e.name?e.name:e.uuid,c=[];di[r.path]===di.weights?e.traverse(function(d){d.morphTargetInfluences&&c.push(d.name?d.name:d.uuid)}):c.push(o);let l;switch(di[r.path]){case di.weights:l=Gn;break;case di.rotation:l=Wn;break;case di.position:case di.scale:l=Xn;break;default:n.itemSize===1?l=Gn:l=Xn;break}let h=s.interpolation!==void 0?px[s.interpolation]:vs,u=this._getArrayFromAccessor(n);for(let d=0,f=c.length;d<f;d++){let g=new l(c[d]+"."+di[r.path],t.array,u,h);s.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(g),a.push(g)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let n=_h(t.constructor),s=new Float32Array(t.length);for(let r=0,a=t.length;r<a;r++)s[r]=t[r]*n;t=s}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){let s=this instanceof Wn?gh:Ka;return new s(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}});function wx(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i)))}function Sx(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function Ex(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(uf),this.state=it.NONE;break;case 1:let e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function Ax(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Ui.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=it.DOLLY;break;case Ui.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=it.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=it.ROTATE}break;case Ui.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=it.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=it.PAN}break;default:this.state=it.NONE}this.state!==it.NONE&&this.dispatchEvent(bh)}function Tx(i){switch(this.state){case it.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case it.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case it.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function Rx(i){this.enabled===!1||this.enableZoom===!1||this.state!==it.NONE||(i.preventDefault(),this.dispatchEvent(bh),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(uf))}function Cx(i){this.enabled===!1||this.enablePan===!1||this._handleKeyDown(i)}function Ix(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case ki.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=it.TOUCH_ROTATE;break;case ki.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=it.TOUCH_PAN;break;default:this.state=it.NONE}break;case 2:switch(this.touches.TWO){case ki.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=it.TOUCH_DOLLY_PAN;break;case ki.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=it.TOUCH_DOLLY_ROTATE;break;default:this.state=it.NONE}break;default:this.state=it.NONE}this.state!==it.NONE&&this.dispatchEvent(bh)}function Px(i){switch(this._trackPointer(i),this.state){case it.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case it.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case it.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case it.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=it.NONE}}function Lx(i){this.enabled!==!1&&i.preventDefault()}function Nx(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function Dx(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}var lf,bh,uf,Za,hf,Mx,Mt,jt,it,xh,Ja,df=lt(()=>{mr();lf={type:"change"},bh={type:"start"},uf={type:"end"},Za=new oi,hf=new yn,Mx=Math.cos(70*As.DEG2RAD),Mt=new O,jt=2*Math.PI,it={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},xh=1e-6,Ja=class extends Wa{constructor(e,t=null){super(e,t),this.state=it.NONE,this.enabled=!0,this.target=new O,this.cursor=new O,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Ui.ROTATE,MIDDLE:Ui.DOLLY,RIGHT:Ui.PAN},this.touches={ONE:ki.ROTATE,TWO:ki.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new O,this._lastQuaternion=new Pt,this._lastTargetPosition=new O,this._quat=new Pt().setFromUnitVectors(e.up,new O(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new dr,this._sphericalDelta=new dr,this._scale=1,this._panOffset=new O,this._rotateStart=new Te,this._rotateEnd=new Te,this._rotateDelta=new Te,this._panStart=new Te,this._panEnd=new Te,this._panDelta=new Te,this._dollyStart=new Te,this._dollyEnd=new Te,this._dollyDelta=new Te,this._dollyDirection=new O,this._mouse=new Te,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=Sx.bind(this),this._onPointerDown=wx.bind(this),this._onPointerUp=Ex.bind(this),this._onContextMenu=Lx.bind(this),this._onMouseWheel=Rx.bind(this),this._onKeyDown=Cx.bind(this),this._onTouchStart=Ix.bind(this),this._onTouchMove=Px.bind(this),this._onMouseDown=Ax.bind(this),this._onMouseMove=Tx.bind(this),this._interceptControlDown=Nx.bind(this),this._interceptControlUp=Dx.bind(this),this.domElement!==null&&this.connect(),this.update()}connect(){this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(lf),this.update(),this.state=it.NONE}update(e=null){let t=this.object.position;Mt.copy(t).sub(this.target),Mt.applyQuaternion(this._quat),this._spherical.setFromVector3(Mt),this.autoRotate&&this.state===it.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let n=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(n)&&isFinite(s)&&(n<-Math.PI?n+=jt:n>Math.PI&&(n-=jt),s<-Math.PI?s+=jt:s>Math.PI&&(s-=jt),n<=s?this._spherical.theta=Math.max(n,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(n+s)/2?Math.max(n,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=a!=this._spherical.radius}if(Mt.setFromSpherical(this._spherical),Mt.applyQuaternion(this._quatInverse),t.copy(this.target).add(Mt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){let o=Mt.length();a=this._clampDistance(o*this._scale);let c=o-a;this.object.position.addScaledVector(this._dollyDirection,c),this.object.updateMatrixWorld(),r=!!c}else if(this.object.isOrthographicCamera){let o=new O(this._mouse.x,this._mouse.y,0);o.unproject(this.object);let c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=c!==this.object.zoom;let l=new O(this._mouse.x,this._mouse.y,0);l.unproject(this.object),this.object.position.sub(l).add(o),this.object.updateMatrixWorld(),a=Mt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Za.origin.copy(this.object.position),Za.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Za.direction))<Mx?this.object.lookAt(this.target):(hf.setFromNormalAndCoplanarPoint(this.object.up,this.target),Za.intersectPlane(hf,this.target))))}else if(this.object.isOrthographicCamera){let a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>xh||8*(1-this._lastQuaternion.dot(this.object.quaternion))>xh||this._lastTargetPosition.distanceToSquared(this.target)>xh?(this.dispatchEvent(lf),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?jt/60*this.autoRotateSpeed*e:jt/60/60*this.autoRotateSpeed}_getZoomScale(e){let t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Mt.setFromMatrixColumn(t,0),Mt.multiplyScalar(-e),this._panOffset.add(Mt)}_panUp(e,t){this.screenSpacePanning===!0?Mt.setFromMatrixColumn(t,1):(Mt.setFromMatrixColumn(t,0),Mt.crossVectors(this.object.up,Mt)),Mt.multiplyScalar(e),this._panOffset.add(Mt)}_pan(e,t){let n=this.domElement;if(this.object.isPerspectiveCamera){let s=this.object.position;Mt.copy(s).sub(this.target);let r=Mt.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/n.clientHeight,this.object.matrix),this._panUp(2*t*r/n.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/n.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/n.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let n=this.domElement.getBoundingClientRect(),s=e-n.left,r=t-n.top,a=n.width,o=n.height;this._mouse.x=s/a*2-1,this._mouse.y=-(r/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(jt*this._rotateDelta.x/t.clientHeight),this._rotateUp(jt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateUp(-jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this._rotateLeft(-jt*this.rotateSpeed/this.domElement.clientHeight):this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(n,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(n,s)}}_handleTouchStartDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{let n=this._getSecondPointerPosition(e),s=.5*(e.pageX+n.x),r=.5*(e.pageY+n.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let t=this.domElement;this._rotateLeft(jt*this._rotateDelta.x/t.clientHeight),this._rotateUp(jt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{let t=this._getSecondPointerPosition(e),n=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(n,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){let t=this._getSecondPointerPosition(e),n=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(n*n+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new Te,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){let t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){let t=e.deltaMode,n={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:n.deltaY*=16;break;case 2:n.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(n.deltaY*=10),n}}});function ff(i,e,t){let n=e.minCycle||e.dwell?1.1:2.1,s=(1-Math.cos(t*n))/2,r=()=>{i.le=[-.29,.96,0],i.re=[.29,.96,0],i.lw=[-.23,1.37,0],i.rw=[.23,1.37,0]},a=e.detector;if(a==="pushup"||a==="plank"){let o=a==="plank"?0:s,c=e.incline?.45:0,l=e.support==="knees";for(let[h,u]of[["l",-.12],["r",.12]])i[h+"s"]=[-.56,.04-o*.27+c,u],i[h+"h"]=[.25,-.04+c*.4,u],i[h+"k"]=[.58,l?-.48:-.12,u],i[h+"a"]=[.91,e.decline?.15:l?-.38:-.28,u],i[h+"w"]=[-.58,-.51+c,e.narrow?u*.2:e.wide?u*2.5:u],i[h+"e"]=e.forearm?[-.57,-.5,u]:[-.57+o*.18,-.25-o*.04+c,u];i.head=[-.85,.1-s*.27*(a==="pushup")+c,0],i.neck=[-.68,.04-s*.27*(a==="pushup")+c,0]}else if(a==="squat"||a==="split"){let o=(e.travel?.22:.4)*s;for(let c of["head","neck","ls","rs","le","re","lw","rw","lh","rh"])i[c][1]-=o;if(a==="split"){let c=e.side==="right"?"r":"l",l=c==="l"?"r":"l";i[c+"k"]=[-.6,-.43-o*.4,.04],i[c+"a"]=[-.6,-.95,.04],i[l+"k"]=[.45,-.47-o*.5,-.05],i[l+"a"]=[.8,-.95,-.05]}else{let c=e.wide?.34:.18;i.lk=[-c-.13*s,-.46-o*.5,.25*s],i.rk=[c+.13*s,-.46-o*.5,.25*s],i.la=[-c,-.95,0],i.ra=[c,-.95,0]}i.le=[-.3,.24-o,.25],i.re=[.3,.24-o,.25],i.lw=[-.15,.36-o,.4],i.rw=[.15,.36-o,.4]}else if(a==="hinge"){let o=s*(e.bend?.45:.9),c=Math.cos(o),l=Math.sin(o);for(let h of["head","neck","ls","rs","le","re","lw","rw"]){let u=i[h][1];i[h][1]=u*c,i[h][2]=u*l}e.arms==="chest"&&(i.lw=[.1,.37*c,.37*l+.1],i.rw=[-.1,.37*c,.37*l+.1])}else if(a==="bridge"){for(let[o,c]of[["l",-.14],["r",.14]])i[o+"s"]=[-.67,-.53,c],i[o+"h"]=[0,-.5+s*.37,c],i[o+"k"]=[.38,.02,c],i[o+"a"]=[.66,-.53,c],i[o+"e"]=[-.4,-.54,c*1.4],i[o+"w"]=[-.1,-.54,c*1.7];i.head=[-.93,-.47,0],i.neck=[-.78,-.5,0]}else if(a==="sideplank"){let o=e.side==="left"?"l":"r",c=o==="l"?"r":"l";i[o+"s"]=[-.5,-.03,0],i[c+"s"]=[-.5,.32,0],i[o+"h"]=[.2,-.18,0],i[c+"h"]=[.2,.08,0],i[o+"e"]=[-.5,-.3,0],i[o+"w"]=[-.48,-.55,0],i[c+"e"]=[-.5,.64,0],i[c+"w"]=[-.5,.96,0];for(let l of[o,c])i[l+"k"]=[.57,-.31,l===o?0:.08],i[l+"a"]=[e.support==="knees"?.25:.94,-.53,l===o?0:.08];i.neck=[-.65,.18,0],i.head=[-.87,.21,0]}else if(a==="raise"){let o=s*(e.overhead?Math.PI:Math.PI/2);for(let[c,l]of[["l",-1],["r",1]])for(let[h,u]of[["e",.36],["w",.73]])i[c+h]=[l*(.23+(e.plane==="front"?0:Math.sin(o)*u)),.57-Math.cos(o)*u,e.plane==="front"?Math.sin(o)*u:0]}else if(a==="press")for(let[o,c]of[["l",-1],["r",1]])i[o+"e"]=[c*(.56-.28*s),.53+.4*s,0],i[o+"w"]=[c*(.56-.31*s),.89+.43*s,0];else if(a==="balance"){let o=e.low?.15:.4;i.lk=[-.17-(e.kneeLift?0:.3),-.46+o,e.kneeLift?.45:0],i.la=e.kneeLift?[-.17,-.63,.48]:[.12,e.low?-.78:-.4,0],i.lw=[-.02,.45,.16],i.rw=[.02,.45,.16],i.le=[-.32,.22,.07],i.re=[.32,.22,.07],e.overhead&&r()}else if(a==="yoga"||a==="stance"){let o=e.pose??"horse";if(o==="salute"&&r(),o==="chair"){for(let c of["head","neck","ls","rs","le","re","lw","rw","lh","rh"])i[c][1]-=.28;i.lk=[-.17,-.55,.3],i.rk=[.17,-.55,.3],r();for(let c of["le","re","lw","rw"])i[c][1]-=.28}if(["warrior","warrior-one"].includes(o)||e.side){let c=e.side==="right"?"r":"l",l=c==="l"?"r":"l",h=c==="l"?-1:1;i[c+"k"]=[h*.66,-.33,0],i[c+"a"]=[h*.66,-.85,0],i[l+"k"]=[-h*.46,-.43,0],i[l+"a"]=[-h*.82,-.88,0],o==="warrior"?(i.le=[-.6,.57,0],i.re=[.6,.57,0],i.lw=[-.98,.57,0],i.rw=[.98,.57,0]):o==="warrior-one"&&r()}else if(o==="horse"||o==="goddess"){let c=e.high?.06:e.low?.35:.23;i.lk=[-.56,-.44+c,0],i.rk=[.56,-.44+c,0],i.la=[-.56,-.94+c,0],i.ra=[.56,-.94+c,0];for(let l of Object.values(i))l[1]-=c;o==="goddess"?(i.le=[-.58,.48-c,0],i.re=[.58,.48-c,0],i.lw=[-.58,.84-c,0],i.rw=[.58,.84-c,0]):(i.lw=[-.06,.42-c,.1],i.rw=[.06,.42-c,.1],i.le=[-.34,.22-c,0],i.re=[.34,.22-c,0])}}else if(a==="boxing"){for(let[o,c,l]of[["l",-1,Math.sin(t*(e.double?5:2.5))],["r",1,-Math.sin(t*2.5)]]){let h=e.side&&e.side!=={l:"left",r:"right"}[o]?0:Math.max(0,l);i[o+"e"]=[c*.28,.37+h*.16,.2+h*.22],i[o+"w"]=[c*.2,.55,.25+h*.65]}i.la=[-.32,-.95,.1],i.ra=[.32,-.95,-.17]}else if(a==="march")for(let[o,c,l]of[["l",-1,Math.sin(t*(e.id==="jogging"?4:2))],["r",1,-Math.sin(t*(e.id==="jogging"?4:2))]]){let h=Math.max(0,l)*(e.lift?.48:e.id==="march"?.2:.32);i[o+"k"]=[c*.17,-.46+h,h],i[o+"a"]=[c*.17,-.95+h,.06],i[o+"e"]=[c*.32,.22,-l*.18],i[o+"w"]=[c*.27,.42,-l*.32]}else if(a==="jack"){let o=e.step?(1-Math.cos(t*2))/2:s;for(let[c,l]of[["l",-1],["r",1]]){let h=o*2.8;i[c+"e"]=[l*(.23+Math.sin(h)*.36),.57-Math.cos(h)*.36,0],i[c+"w"]=[l*(.23+Math.sin(h)*.73),.57-Math.cos(h)*.73,0];let u=!e.step||Math.floor(t/Math.PI)%2===0==(c==="l");i[c+"a"]=[l*(.17+(u?.48*o:0)),-.95,0],i[c+"k"]=[l*(.17+(u?.24*o:0)),-.46,0]}}return i}var pf=lt(()=>{});function Mh(i,e=0){let t={head:[0,.85,0],neck:[0,.65,0],ls:[-.23,.57,0],rs:[.23,.57,0],le:[-.31,.18,0],re:[.31,.18,0],lw:[-.3,-.13,0],rw:[.3,-.13,0],lh:[-.15,0,0],rh:[.15,0,0],lk:[-.17,-.46,0],rk:[.17,-.46,0],la:[-.17,-.95,0],ra:[.17,-.95,0]},n=Math.sin(e*4),s=Math.max(0,Math.sin(e*3.6));if(i==="tree"&&(t.lk=[-.52,-.2,0],t.la=[.12,-.38,0],t.le=[-.3,.32,0],t.re=[.3,.32,0],t.lw=[-.025,.48,.08],t.rw=[.025,.48,.08]),i==="warrior"&&(t.lk=[-.65,-.4,0],t.la=[-.65,-.95,0],t.rk=[.46,-.43,0],t.ra=[.82,-.95,0],t.le=[-.58,.57,0],t.re=[.58,.57,0],t.lw=[-.94,.57,0],t.rw=[.94,.57,0]),i==="horse"){t.lk=[-.53,-.25,0],t.rk=[.53,-.25,0],t.la=[-.53,-.79,0],t.ra=[.53,-.79,0],t.le=[-.3,.24,.05],t.re=[.3,.24,.05],t.lw=[-.03,.42,.15],t.rw=[.03,.42,.15];for(let r of Object.values(t))r[1]-=.15}if(i==="boxing"){for(let[r,a,o]of[["l",-1,n],["r",1,-n]]){let c=Math.max(0,o);t[r+"e"]=[a*.28,.37+c*.16,.2+c*.22],t[r+"w"]=[a*.2,.55,.25+c*.65]}t.la=[-.32,-.95,.1],t.ra=[.32,-.95,-.17]}if(i==="jogging"){for(let[r,a,o]of[["l",-1,n],["r",1,-n]]){let c=Math.max(0,o);t[r+"k"]=[a*.17,-.46+c*.4,c*.36],t[r+"a"]=[a*.17,-.95+c*.42,.06],t[r+"e"]=[a*.32,.22,-o*.18],t[r+"w"]=[a*.27,.42,-o*.32]}for(let r of Object.values(t))r[1]+=.035*Math.abs(n)}if(i==="jumping"){for(let r of Object.values(t))r[1]+=.3*s;t.le[0]-=.1*s,t.re[0]+=.1*s,t.lw[1]+=.45*s,t.rw[1]+=.45*s}return Rt[i]?ff(t,Rt[i],e):t}var wh,mf=lt(()=>{Kn();pf();wh=[["head","neck"],["ls","rs"],["neck","lh"],["neck","rh"],["lh","rh"],["ls","le"],["le","lw"],["rs","re"],["re","rw"],["lh","lk"],["lk","la"],["rh","rk"],["rk","ra"]]});var gf={};vi(gf,{createHologram:()=>Ux});async function Ux(i,e,{still:t=!1}={}){let n,s,r=0,a,o,c,l=null,h=0,u=!1,d=!0,f=new wa,g=new Bt;f.add(g);function y(m){m.traverse(_=>{if(_.geometry?.dispose(),_.material)for(let x of[_.material].flat()){for(let b of Object.values(x))b?.isTexture&&b.dispose();x.dispose()}})}function p(){u||(u=!0,cancelAnimationFrame(r),a?.disconnect(),s?.dispose(),o?.stopAllAction(),c&&o?.uncacheRoot(c),y(f),n?.dispose(),n?.forceContextLoss(),n?.domElement.remove())}try{let x=function(){g.rotation.set(0,["boxing","jogging"].includes(e)?-.45:0,0),m.position.set(0,.15,Math.max(4.8,3.6/(i.clientWidth/Math.max(i.clientHeight,1)))),s.target.set(0,0,0),s.update()},b=function(){let E=i.getBoundingClientRect();n.setSize(Math.max(E.width,1),Math.max(E.height,1),!1),m.aspect=E.width/Math.max(E.height,1),m.updateProjectionMatrix()},A=function(E){if(u)return;let N=Math.min((E-C)/1e3,.06);C=E,d&&(o?.update(N),h+=N,l?.(h)),s.update(),n.render(f,m),r=requestAnimationFrame(A)};n=new Ma({alpha:!0,antialias:!0,powerPreference:"low-power"}),n.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)),n.setClearColor(0,0),i.append(n.domElement);let m=new _t(38,1,.01,100);if(s=new Ja(m,n.domElement),s.enablePan=!1,s.enableDamping=!0,s.minDistance=1.5,s.maxDistance=12,s.minPolarAngle=.15,s.maxPolarAngle=Math.PI-.15,["squat","pushup"].includes(e)){let E=new AbortController,N=setTimeout(()=>E.abort(),2e4),j;try{let $=await fetch("/models/"+e+".glb",{signal:E.signal});if(!$.ok)throw new Error("Model file unavailable.");j=await $.arrayBuffer()}finally{clearTimeout(N)}let v=await new ja().parseAsync(j,"");c=v.scene,o=new Ga(c),v.animations.forEach($=>o.clipAction($).play()),o.update(0),c.updateMatrixWorld(!0);let M=new Yt().setFromObject(c),L=M.getSize(new O),U=M.getCenter(new O),I=2/Math.max(L.x,L.y,L.z),R=new Bt;R.position.copy(U).multiplyScalar(-1),R.add(c);let P=new Bt;P.scale.setScalar(I),P.add(R),g.add(P),c.traverse($=>{if($.isMesh){let V=[$.material].flat();$.material=new $t({color:10156772,wireframe:!0,transparent:!0,opacity:.72});for(let k of V){for(let Y of Object.values(k))Y?.isTexture&&Y.dispose();k.dispose()}$.frustumCulled=!1}})}else{c=new Bt,g.add(c);let E=new $t({color:10156772,wireframe:!0,transparent:!0,opacity:.8}),N=Object.fromEntries(Object.keys(Mh(e)).map(I=>{let R=new gt(new Ua(I==="head"?.13:.047,12,8),E);return c.add(R),[I,R]})),j=wh.map(()=>{let I=new gt(new Na(.035,.045,1,8,4),E);return c.add(I),I}),v=new O(0,1,0),M=new O,L=new O,U=new O;l=I=>{let R=Mh(e,I);for(let[P,$]of Object.entries(N))$.position.fromArray(R[P]);wh.forEach(([P,$],V)=>{M.fromArray(R[P]),L.fromArray(R[$]);let k=j[V];U.subVectors(L,M),k.position.copy(M).add(L).multiplyScalar(.5),k.scale.y=U.length(),k.quaternion.setFromUnitVectors(v,U.normalize())})},l(0)}let _=new gt(new Da(1.02,1.035,64),new $t({color:9238240,transparent:!0,opacity:.35,side:sn}));_.rotation.x=-Math.PI/2,_.position.y=-1.05,f.add(_),a=new ResizeObserver(b),a.observe(i),x(),b();let C=performance.now();return t||(r=requestAnimationFrame(A)),{dispose:p,reset:x,capturePose:async E=>(o?.setTime(E),l?.(E),s.update(),n.render(f,m),new Promise(N=>n.domElement.toBlob(N,"image/png"))),toggle:()=>d=!d,zoom:E=>{m.position.sub(s.target).multiplyScalar(E).clampLength(s.minDistance,s.maxDistance).add(s.target),s.update()},rotate:(E,N)=>{g.rotation.y+=E,g.rotation.x=As.clamp(g.rotation.x+N,-1.2,1.2)}}}catch(m){throw p(),m}}var yf=lt(()=>{mr();cf();df();mf()});function kx(i,e=1){if(!i||i.length<21||i.some(a=>!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<0||a.x>1||a.y<0||a.y>1))return null;let t=i.map(a=>({x:a.x*e,y:a.y})),n=bn(t[0],t[9]);if(n<.025)return null;let s=[8,12,16,20].map(a=>bn(t[a],t[0])>bn(t[a-2],t[0])*1.25),r=[8,12,16,20].map(a=>bn(t[a],t[0])<bn(t[a-2],t[0])*1.12);return{wrist:t[0],tip:t[8],base:t[6],fist:r.every(Boolean),point:s[0]&&r.slice(1).every(Boolean),thumb:r.every(Boolean)&&t[4].y<t[3].y-n*.2&&t[4].y<t[5].y-n*.35&&bn(t[4],t[0])>n*1.15}}var bn,Qa,eo,_f=lt(()=>{bn=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y);Qa=class{constructor(){this.pumpSide=0,this.pumps=[],this.last=0}update(e,t,n,s=1){let r=t.map(y=>kx(y,s)).filter(Boolean),a=r.some(y=>y.thumb);if(n-this.last>850&&(this.pumps=[],this.pumpSide=0),this.last=n,!e||e.length<25)return{mode:null,thumb:a};let o=e.map(y=>({...y,x:y.x*s}));if(!(y=>y.every(p=>o[p]&&o[p].visibility>=.5&&e[p].x>=0&&e[p].x<=1&&e[p].y>=0&&e[p].y<=1))([11,12,13,14,15,16,23,24]))return{mode:null,thumb:a};let l=(bn(o[11],o[23])+bn(o[12],o[24]))/2;if(l<.06)return{mode:null,thumb:a};let h=(y,p,m)=>bn(y,p)<l*m;for(let[y,p,m,_]of[[11,13,15,16],[12,14,16,15]]){let x={x:(o[y].x+o[p].x)/2,y:(o[y].y+o[p].y)/2};if(o[p].y<o[y].y+.12*l&&o[m].y<o[y].y-.25*l&&r.some(b=>b.point&&h(b.wrist,o[_],.65)&&h(b.tip,x,.75)&&bn(b.tip,x)<bn(b.base,x)))return{mode:"pushup",thumb:a}}let u=o[15].y<o[11].y-.45*l&&o[16].y<o[12].y-.45*l,d=null;u?d=h(o[15],o[16],.5)?"tree":"jumping":h(o[15],o[23],.42)&&h(o[16],o[24],.42)?d="squat":Math.abs(o[15].y-o[11].y)<.25*l&&Math.abs(o[16].y-o[12].y)<.25*l&&Math.abs(o[15].x-o[16].x)>2.3*l?d="warrior":h(o[15],o[16],.35)&&o[15].y>Math.min(o[11].y,o[12].y)&&o[15].y<(o[11].y+o[23].y)/2?d="horse":r.filter(y=>y.fist&&!y.thumb).length>=2&&h(o[15],o[11],.8)&&h(o[16],o[12],.8)&&(d="boxing");let f=(o[15].y-o[16].y)/l,g=f>.45?1:f<-.45?-1:0;return g&&g!==this.pumpSide&&(this.pumpSide=g,this.pumps.push(n)),this.pumps=this.pumps.filter(y=>n-y<3e3),!d&&this.pumps.length>=4&&(d="jogging"),{mode:d,thumb:a}}},eo=class{constructor(){this.reset()}reset(){this.candidate=null,this.since=0,this.pending=null,this.expires=0,this.thumbSince=null,this.last=null,this.blocked=null}update({mode:e=null,thumb:t=!1},n){let s=this.last!==null&&n-this.last>850;if(this.last=n,s&&(this.candidate=null,this.thumbSince=null),e||(this.blocked=null),this.pending){if(n>=this.expires)return this.blocked=this.pending,this.pending=null,this.thumbSince=null,{event:"expired",progress:0};if(t){this.thumbSince??=n;let r=Math.min(1,(n-this.thumbSince)/1400);if(r===1){let a=this.pending;return this.reset(),this.blocked=a,{event:"confirmed",mode:a,progress:1}}return{event:"holding",mode:this.pending,progress:r}}return this.thumbSince=null,{event:"pending",mode:this.pending,progress:0}}return!e||t||e===this.blocked?(this.candidate=null,{event:"idle",progress:0}):(e!==this.candidate&&(this.candidate=e,this.since=n),n-this.since>=650?(this.pending=e,this.expires=n+12e3,this.candidate=null,{event:"proposed",mode:e,progress:0}):{event:"recognizing",mode:e,progress:0})}}});function Ox(i="environment",e=30){return{audio:!1,video:{...i.startsWith("device:")?{deviceId:{exact:i.slice(7)}}:{facingMode:{ideal:i}},width:{ideal:640},height:{ideal:480},frameRate:{ideal:e,max:30},resizeMode:"none"}}}async function vf(){return(await navigator.mediaDevices.enumerateDevices()).filter(i=>i.kind==="videoinput"&&i.deviceId).map(i=>({id:i.deviceId,label:i.label}))}async function to(i="environment",e=30,t=navigator.mediaDevices){let n=i;if(!i.startsWith("device:"))try{let s=i==="user"?/(front|user|selfie)/i:/(back|rear|environment)/i,r=(await t.enumerateDevices()).find(a=>a.kind==="videoinput"&&a.deviceId&&s.test(a.label));r&&(n=yr(r.deviceId))}catch{}return t.getUserMedia(Ox(n,e))}function xf(i){return i.find(e=>!/(front|user|facetime|selfie)/i.test(e.label)&&/(ultra[\s-]?wide|ultrawide|0[.,][56]\s*[x×])/i.test(e.label))}function no(i,e){return i.getSettings().facingMode||(/(front|user|selfie)/i.test(i.label)||e==="user"?"user":"environment")}async function io(i){let e=i.getCapabilities?.()||{},t=e.zoom;if(!(t&&Number.isFinite(t.min)&&Number.isFinite(t.max)&&t.min>0&&t.max>=t.min))return{supported:!1,applied:!1,zoom:i.getSettings().zoom??null};try{await i.applyConstraints({advanced:[{zoom:t.min}]});let s=i.getSettings().zoom;return{supported:!0,applied:Number.isFinite(s)&&Math.abs(s-t.min)<.01,min:t.min,max:t.max,zoom:s??null}}catch(s){return{supported:!0,applied:!1,min:t.min,max:t.max,zoom:i.getSettings().zoom??null,error:s.message}}}function bf(i,e,t){let n=i.getSettings();return{version:"feet-optional-3",label:i.label||"Camera",facing:n.facingMode||"",width:n.width||0,height:n.height||0,zoom:t,lenses:e.map(s=>s.label||"Unnamed camera")}}var yr,Sh=lt(()=>{yr=i=>"device:"+i});var Mf={};vi(Mf,{HandControl:()=>Eh});var so,Eh,wf=lt(()=>{_f();Sh();so=(i,e,t)=>{let n;return Promise.race([i,new Promise((s,r)=>{n=setTimeout(()=>r(new Error(t)),e)})]).finally(()=>clearTimeout(n))},Eh=class{constructor(e){Object.assign(this,e),this.recognizer=new Qa,this.confirmation=new eo,this.running=!1,this.models=[],this.frame=0,this.lastVideo=-1,this.lastInference=-1/0}async start(){this.running=!0;try{let e=await to(this.camera,20);if(!this.running){e.getTracks().forEach(r=>r.stop());return}if(this.stream=e,this.video.srcObject=e,await so(this.video.play(),1e4,"No camera frames. Try the other camera."),!this.running||(await io(e.getVideoTracks()[0]),!this.running))return;this.video.style.transform=no(e.getVideoTracks()[0],this.camera)==="user"?"scaleX(-1)":"none",this.video.hidden=!1,this.message("Loading gesture recognition\u2026");let t=await so(import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"),2e4,"Gesture library download timed out.");if(!this.running)return;let n=await so(t.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"),2e4,"Gesture runtime download timed out.");if(!this.running)return;let s=async(r,a,o)=>{let c=!1,l=r.createFromOptions(n,{baseOptions:{modelAssetPath:a,delegate:"CPU"},runningMode:"VIDEO",...o});l.then(h=>{(!this.running||c)&&h.close()},()=>{});try{let h=await so(l,6e4,"Gesture model loading timed out.");return this.running&&this.models.push(h),h}catch(h){throw c=!0,h}};if(this.pose=await s(t.PoseLandmarker,"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",{numPoses:1}),!this.running||(this.hand=await s(t.HandLandmarker,"https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",{numHands:2,minHandDetectionConfidence:.6,minTrackingConfidence:.6}),!this.running))return;this.message("Make an exercise gesture, then hold thumbs up to confirm."),this.loop()}catch(e){throw this.stop(),e}}stop(){this.running=!1,cancelAnimationFrame(this.frame),this.models.splice(0).forEach(e=>{try{e.close()}catch{}}),this.stream?.getTracks().forEach(e=>e.stop()),this.stream=null,this.video.pause(),this.video.srcObject=null,this.video.hidden=!0,this.confirmation.reset()}loop(){if(this.running)try{let e=performance.now();if(e-this.lastInference>=125&&this.video.readyState>=2&&this.video.currentTime!==this.lastVideo){this.lastInference=e,this.lastVideo=this.video.currentTime;let t=this.pose.detectForVideo(this.video,e),n=this.hand.detectForVideo(this.video,e),s=this.recognizer.update(t.landmarks[0],n.landmarks,e,this.video.videoWidth/this.video.videoHeight);this.onGesture(this.confirmation.update(s,e))}this.running&&(this.frame=requestAnimationFrame(()=>this.loop()))}catch(e){this.stop(),this.onError("Gesture tracking stopped. "+e.message)}}}});var Hf={};vi(Hf,{initHandCompanion:()=>$x});function $x(){let i=d=>document.getElementById(d),e=null,t=null,n=!1,s=!1;function r(){let d=11;try{let f=JSON.parse(localStorage.getItem(zf));Number.isInteger(f?.sections?.palm)&&f.sections.palm>=0&&f.sections.palm<23&&(d=f.sections.palm)}catch{}for(let f of["identityHandPreview","restHandFallback"])i(f).src="/handborne/previews/family-"+String(d).padStart(2,"0")+".png?v=5"}function a(d){i("handTeamStatus").textContent=d;let f=/could not|unavailable/i.test(d);i("retryHand").hidden=!f,i("restHandFallback").hidden=!f}async function o(){if(e){e.setActive(n);return}return t||(t=(async()=>{try{let{createHandCompanion:d}=await import("/handborne/companion.mjs");if(s||!n)return;e=d(i("restHandMount"),{onStatus:a}),e.setActive(n)}catch{a("3D hand unavailable. Your hand can still help with team strikes.")}finally{t=null}})(),t)}function c(){i("identitySummary").hidden=!0,i("handEditorPanel").hidden=!1,i("identity").classList.add("hand-editing"),i("handEditorFrame").src="/handborne/index.html?embed=1",i("backToAvatar").focus()}function l(){i("handEditorFrame").removeAttribute("src"),i("handEditorPanel").hidden=!0,i("identitySummary").hidden=!1,i("identity").classList.remove("hand-editing"),r(),n&&e?.refresh()}i("customizeHand").addEventListener("click",c),i("backToAvatar").addEventListener("click",()=>{l(),i("customizeHand").focus()}),i("identity").addEventListener("close",l),i("retryHand").addEventListener("click",()=>e?e.refresh():o());let h=d=>{(d.key===zf||d.key===null)&&r()},u=d=>{d.origin!==location.origin||d.source!==i("handEditorFrame").contentWindow||d.data?.type!=="handborne:changed"||r()};return window.addEventListener("storage",h),window.addEventListener("message",u),r(),{edit:c,enter(){n=!0,r(),i("handCharge").value=0,i("handChargeLabel").textContent="Team strike in 3 taps",o()},leave(){n=!1,e?.setActive(!1)},hit(d){e?.gesture(d.assisted?"fist-bump":d.blocked?"high-five":"point-at-you"),i("handCharge").value=d.charge,i("handChargeLabel").textContent=d.assisted?"Team strike!":`Team strike in ${3-d.charge} ${d.charge===2?"tap":"taps"}`,i("handTeamStatus").textContent=d.assisted?d.blocked?"Helping Hand strikes. Coach blocks!":"Helping Hand doubles your strike!":"Helping Hand is charging up."},dispose(){s=!0,e?.dispose(),window.removeEventListener("storage",h),window.removeEventListener("message",u)}}}var zf,Vf=lt(()=>{zf="handborne-recipe-v4"});async function jf(i){if(Zx){let t=await globalThis.crypto.subtle.digest("SHA-256",i);return[...new Uint8Array(t)].map(n=>n.toString(16).padStart(2,"0")).join("")}let{createHash:e}=await import(Jx);return e("sha256").update(Buffer.from(i)).digest("hex")}function tb({maxBytes:i=64*1024}={}){let e=new Map,t=0;return{maxBytes:i,async get(n){let s=e.get(n);return s?Kf(s):null},async put(n,s){let r=Jf(s),a=e.get(n)?.byteLength??0;if(t-a+r.byteLength>i)throw new Error("fixture asset-store quota exceeded");e.set(n,Kf(r)),t+=r.byteLength-a},async remove(n){let s=e.get(n);s&&(t-=s.byteLength,e.delete(n))},async removePrefix(n){for(let s of[...e.keys()])s.startsWith(n)&&await this.remove(s)}}}var $f,Zx,Jx,Jf,Kf,Zf,Qx,KM,eb,_o,Qf=lt(()=>{$f="p13b.device-cache",Zx=globalThis.crypto?.subtle,Jx="node:crypto";Jf=i=>i instanceof Uint8Array?i:Array.isArray(i)?new Uint8Array(i):new TextEncoder().encode(i),Kf=i=>new Uint8Array(i),Zf=i=>String(i).split(".").map(e=>/^\d+$/.test(e)?Number(e):-1),Qx=(i,e)=>{let t=Zf(i),n=Zf(e);for(let s=0;s<Math.max(t.length,n.length);s++){let r=(t[s]??0)-(n[s]??0);if(r)return Math.sign(r)}return 0},KM=Object.freeze(["absent","downloading","downloaded","verified","pending-equip","active","failed"]),eb=()=>{let i=new Map;return{getItem:e=>i.get(e)??null,setItem:(e,t)=>i.set(e,String(t)),removeItem:e=>i.delete(e)}};_o=class{constructor({account:e,storage:t=globalThis.localStorage??eb(),assetStore:n=tb(),workout:s,appVersion:r="1.0.0",runtimeFactory:a=()=>({dispose(){}}),now:o=()=>new Date().toISOString(),onChange:c=()=>{},fail:l={}}={}){if(!e?.getEntitlements)throw new Error("account adapter with getEntitlements() is required");if(!n?.get||!n?.put||!n?.removePrefix)throw new Error("assetStore adapter is required");if(!s?.saveAndConfirmIdle)throw new Error("workout adapter with saveAndConfirmIdle() is required");Object.assign(this,{account:e,storage:t,assetStore:n,workout:s,appVersion:r,runtimeFactory:a,now:o,onChange:c,fail:l}),this.manifests=new Map,this.runtime=null;let h=this.readCache();this.records=h.packs??{},this.candidates=h.candidates??{},this.equipped=h.equipped??null,this.pending=h.pending??null}readCache(){try{return JSON.parse(this.storage.getItem($f)||"{}")}catch{return{}}}persist(){this.storage.setItem($f,JSON.stringify({packs:this.records,candidates:this.candidates,equipped:this.equipped,pending:this.pending}))}emit(e){this.persist(),this.onChange(this.status(e))}pin(e){if(!e.version||!e.sha256)throw new Error("manifest requires pinned version and sha256");return{version:e.version,manifestHash:e.sha256}}key(e,t,n){return`${e}@${t.version}@${t.manifestHash}/${n}`}prefix(e,t){return`${e}@${t.version}@${t.manifestHash}/`}manifest(e,t={}){let n=this.pin(e);return this.manifests.set(e.packId,{manifest:e,source:t,pin:n}),this.records[e.packId]??={state:"absent",receivedBytes:0},this.status(e.packId)}entitled(e){return!!this.account.getEntitlements().some(t=>(typeof t=="string"?t:t.packId)===e)}compatible(e){return Qx(this.appVersion,e.minAppVersion)>=0}isPinned(e,t){return e?.version===t.pin.version&&e?.manifestHash===t.pin.manifestHash}candidateFor(e,t=this.manifests.get(e)){let n=this.records[e];return t&&n?.state==="active"&&!this.isPinned(n,t)?this.candidates[e]??={state:"absent",receivedBytes:0,...t.pin}:n}status(e){let t=this.manifests.get(e),n=this.records[e]??{state:"absent",receivedBytes:0},s=this.candidates[e],r=n.state==="active"?n:s??n;return{...t?{packId:e,version:r.version??t.manifest.version}:{packId:e},...r,entitlement:this.entitled(e),equipped:this.equipped?.packId===e,pending:this.pending?.packId===e,...n.state==="active"&&s?{candidate:{...s}}:{}}}all(){return[...this.manifests.keys()].map(e=>this.status(e))}reset(e,t){this.candidateFor(e,t)===this.records[e]?this.records[e]={state:"absent",receivedBytes:0,...t.pin}:this.candidates[e]={state:"absent",receivedBytes:0,...t.pin}}async received(e,t){let n=0;for(let s of t.manifest.assets)n+=(await this.assetStore.get(this.key(e,t.pin,s.path)))?.byteLength??0;return n}async download(e,{resume:t=!0}={}){let n=this.manifests.get(e);if(!n)throw new Error("unknown pack");if(!this.entitled(e))throw new Error("pack is not entitled");if(!this.compatible(n.manifest))return this.failState(e,"incompatible app version");let s=this.candidateFor(e,n);(!s||!this.isPinned(s,n)||!t)&&(s&&this.isPinned(s,n)&&await this.assetStore.removePrefix(this.prefix(e,n.pin)),this.reset(e,n),s=this.candidateFor(e,n)),s.state="downloading",delete s.error,this.emit(e);for(let r of n.manifest.assets){let a=this.key(e,n.pin,r.path),o=t?await this.assetStore.get(a):null;if(o?.byteLength!==r.bytes){if(this.fail.download)return this.failState(e,"download interrupted; resume available");try{let c=typeof n.source?.get=="function"?await n.source.get(r,o):n.source[r.path];if(c===void 0)return this.failState(e,`missing fixture ${r.path}`);await this.assetStore.put(a,Jf(c))}catch(c){return this.failState(e,`asset storage/download failed: ${c?.message||"unknown failure"}`)}s.receivedBytes=await this.received(e,n),this.emit(e)}}return s.receivedBytes=await this.received(e,n),s.state="downloaded",this.emit(e),this.status(e)}async validate(e,{markFailed:t=!0,record:n,entry:s}={}){let r=s??this.manifests.get(e),a=n??this.candidateFor(e,r),o;!r||!a?o="missing manifest or cache record":this.entitled(e)?this.compatible(r.manifest)?this.isPinned(a,r)||(o="cached pack does not match pinned manifest"):o="incompatible app version":o="pack is not entitled";let c=[];if(!o)for(let l of r.manifest.assets){let h=await this.assetStore.get(this.key(e,r.pin,l.path));if(!h||h.byteLength!==l.bytes||await jf(h)!==l.sha256){o=`integrity check failed: ${l.path}`;break}c.push(...h)}return!o&&await jf(new Uint8Array(c))!==r.manifest.sha256&&(o="manifest integrity check failed"),o&&t&&this.failState(e,o),{ok:!o,reason:o}}async verify(e){let t=this.candidateFor(e);if(!t||t.state!=="downloaded")throw new Error("pack is not downloaded");return this.fail.verify?this.failState(e,"integrity check failed"):(await this.validate(e)).ok?(t.state="verified",t.verifiedAt=this.now(),delete t.error,this.emit(e),this.status(e)):this.status(e)}async equipPending(e){let t=this.candidateFor(e);if(!t||t.state!=="verified")throw new Error("only verified packs can be equipped");return(await this.validate(e)).ok?(this.pending&&this.pending.packId!==e&&this.records[this.pending.packId]?.state==="pending-equip"&&(this.records[this.pending.packId].state="verified"),this.pending={packId:e,...this.manifests.get(e).pin},t.state="pending-equip",this.emit(e),this.status(e)):this.status(e)}async restart(){if(!this.pending)return this.all();let e=await this.workout.saveAndConfirmIdle();if(!(e===!0||e?.saved===!0&&e?.idle===!0))throw new Error("workout save/idle acknowledgment is required before activation");try{let t=this.pending.packId,n=this.candidateFor(t);if(!(await this.validate(t)).ok)return this.pending=null,this.persist(),this.all();if(this.fail.activation)throw new Error("activation failed");let s=this.manifests.get(t),r=await this.runtimeFactory(t,n,s.manifest);if(!r?.dispose)throw new Error("runtime factory returned no disposable runtime");let a=this.runtime,o=this.equipped?.packId;this.runtime=r,this.equipped={packId:t,...s.pin},this.pending=null,n.state="active",n.manifest=s.manifest,delete n.error,this.records[t]=n,delete this.candidates[t],o&&o!==t&&this.records[o]&&(this.records[o].state="verified"),this.persist(),this.onChange(this.status(t));try{a?.dispose()}catch{}return this.all()}catch(t){let n=this.pending?.packId,s=this.candidateFor(n);return s&&(s.state="pending-equip",s.error=`activation failed: ${t.message||"runtime error"}`),this.persist(),this.all()}finally{e?.release?.()}}async restore(){if(!this.equipped)return this.all();let e=this.equipped.packId,t=this.records[e],n=t?.manifest,s=n?{manifest:n,pin:{version:t.version,manifestHash:t.manifestHash}}:null,r=await this.validate(e,{markFailed:!1,record:t,entry:s});if(!r.ok)return t&&(t.state="failed",t.error=r.reason),this.equipped=null,this.persist(),this.all();try{let a=await this.runtimeFactory(e,t,n);if(!a?.dispose)throw new Error("runtime factory returned no disposable runtime");return this.runtime=a,t.state="active",this.persist(),this.all()}catch(a){return t.state="failed",t.error=`restore failed: ${a.message||"runtime error"}`,this.equipped=null,this.persist(),this.all()}}async evict(e){let t=this.records[e],n=this.manifests.get(e);if(t){if(this.equipped?.packId===e)throw new Error("cannot evict equipped pack");n&&this.isPinned(t,n)&&await this.assetStore.removePrefix(this.prefix(e,n.pin)),this.records[e]={state:"absent",receivedBytes:0},this.pending?.packId===e&&(this.pending=null),this.emit(e)}}failState(e,t){let n=this.manifests.get(e),s=this.candidateFor(e,n)??(this.records[e]??={receivedBytes:0});return s.state="failed",s.error=t,this.pending?.packId===e&&(this.pending=null),this.emit(e),this.status(e)}}});function ep({cacheName:i="myr5-pack-assets-v1",cachesApi:e=globalThis.caches}={}){if(!e?.open)throw new Error("CacheStorage is unavailable");let t=s=>new Request(`https://myr5.invalid/packs/${encodeURIComponent(s)}`),n=()=>e.open(i);return{async get(s){let r=await(await n()).match(t(s));return r?new Uint8Array(await r.arrayBuffer()):null},async put(s,r){try{await(await n()).put(t(s),new Response(nb(r),{headers:{"content-type":"application/octet-stream"}}))}catch(a){throw new Error(`durable asset write failed (quota/storage): ${a?.message||a}`)}},async remove(s){await(await n()).delete(t(s))},async removePrefix(s){let r=await n();await Promise.all((await r.keys()).filter(a=>decodeURIComponent(new URL(a.url).pathname.split("/").pop()||"").startsWith(s)).map(a=>r.delete(a)))}}}var nb,tp=lt(()=>{nb=i=>i instanceof Uint8Array?i:new Uint8Array(i)});function vo({owner:i,getWorkoutState:e,saveWorkout:t}={}){return{async saveAndConfirmIdle(){if(i?.acquireIdleLease&&i?.snapshot&&i?.save&&i?.releaseIdleLease){let a=i.acquireIdleLease();if(!a)return{saved:!1,idle:!1,reason:"active workout must not be interrupted"};try{let o=await i.save(),c=i.snapshot();return o!==!0||c.phase!=="idle"||c.revision!==a.revision?(i.releaseIdleLease(a),{saved:!1,idle:!1,reason:"workout changed while saving"}):{saved:!0,idle:!0,local:!0,accountSynced:!1,lease:a,release:()=>i.releaseIdleLease(a)}}catch(o){return i.releaseIdleLease(a),{saved:!1,idle:!1,reason:o?.message||"workout save failed"}}}if(typeof e!="function"||typeof t!="function")return{saved:!1,idle:!1,reason:"workout save/idle integration is not installed"};let n=e();if(!n||n.phase!=="idle")return{saved:!1,idle:!1,reason:"active workout must not be interrupted"};let s=await t(n),r=e();return{saved:s===!0,idle:r?.phase==="idle"}}}}var kh=lt(()=>{});var sp={};vi(sp,{authenticatedPackAccount:()=>np,createIsolatedPackControl:()=>ip,fixtureEntitlementAccount:()=>ib});function np(i=globalThis.coachAccount){return Object.freeze({getEntitlements(){let e=i?.ownedPacks||globalThis.coachEntitlements?.ownedPacks;return Array.isArray(e)?e.filter(t=>t&&typeof t.packId=="string"&&t.status==="owned"&&Number.isSafeInteger(t.grantedAt)):[]}})}function ip({account:i=np(),workout:e,workoutOwner:t,storage:n=globalThis.localStorage,assetStore:s=ep(),...r}={}){return new _o({account:i,storage:n,assetStore:s,workout:e||vo({owner:t}),...r})}var ib,Oh=lt(()=>{Qf();tp();kh();ib=i=>Object.freeze({getEntitlements:()=>[...i]})});var op={};vi(op,{initCinematics:()=>sb});function sb({voice:i}={}){let e=document.body,t=matchMedia("(prefers-reduced-motion: reduce)"),n=(M,L)=>{try{return M.getItem(L)}catch{return null}},s=()=>{try{return t.matches||JSON.parse(n(localStorage,"myr5-motion-v1")||"{}")?.reduced===!0}catch{return t.matches}},r=n(localStorage,"myr5-cinematics-v1")!=="off",a=null,o=0,c=e.dataset.screen,l=!1;if(!document.getElementById("coach-cinematics-style")){let M=document.createElement("link");M.rel="stylesheet",M.href=new URL("cinematics.css",import.meta.url).href,document.head.append(M)}let h=document.createElement("section");h.className="coach-film",h.hidden=!0,h.setAttribute("aria-label","Coach cinematic"),h.innerHTML='<div class="film-doors" aria-hidden="true"><div class="film-door film-door-left"><div class="film-door-brand"><img alt=""></div></div><div class="film-door film-door-right"><div class="film-door-brand"><img alt=""></div></div></div><div class="film-top"><span class="film-label"></span><button type="button" class="film-skip">Skip intro \u2192</button></div><div class="film-scan" aria-hidden="true"></div><div class="film-copy"><p class="film-beat"></p><h1 class="film-title"></h1><p class="film-detail"></p><div class="film-progress" aria-hidden="true"><i></i></div></div>';for(let M of["left","right"])h.querySelector(`.film-door-${M} img`).src=new URL("../pod/mom-inc-mark.png",import.meta.url).href;e.append(h);let u=h.querySelector(".film-label"),d=h.querySelector(".film-title"),f=h.querySelector(".film-beat"),g=h.querySelector(".film-detail"),y=h.querySelector(".film-progress i"),p=h.querySelector("button"),m=[];function _(M="complete"){if(!a)return;let L=a;if(a=null,cancelAnimationFrame(o),delete e.dataset.cinematic,h.hidden=!0,L.kind!=="opening")try{window.myr5Creature?.cinematic(null)}catch{}for(let[U,I]of m.splice(0))U.inert=I;if(L.focus?.isConnected&&!L.focus.closest("[hidden]")&&L.focus.focus({preventScroll:!0}),L.kind==="opening"&&M!=="cancelled")try{sessionStorage.setItem(rp,"yes")}catch{}window.dispatchEvent(new CustomEvent("myr5:cinematic-end",{detail:{kind:L.kind,outcome:M}})),L.resolve(M)}function x(M,L={}){if(!Object.hasOwn(ap,M)||l)return Promise.resolve("cancelled");if(_("cancelled"),!r||s()||document.hidden)return Promise.resolve(document.hidden?"cancelled":"skipped");let U=ap[M],I=M==="home";i?.cancel(),e.dataset.cinematic=M,h.dataset.scene=M,h.hidden=!1,u.textContent=U.label,d.textContent=U.title,g.textContent=M==="pre"?L.name||"Your next movement":M==="post"?document.getElementById("setReceipt")?.textContent||"Your effort counts.":M==="opening"?"MAKING YOU READY.":"",f.textContent=U.beats[0],y.style.transform="scaleX(0)",p.textContent=M==="pre"?"Start now \u2192":M==="post"?"Continue \u2192":"Skip intro \u2192",h.setAttribute("role",I?"region":"dialog"),h.setAttribute("aria-modal",String(!I));let R=document.activeElement;if(!I){for(let P of e.children)P!==h&&!["SCRIPT","LINK","STYLE"].includes(P.tagName)&&(m.push([P,P.inert]),P.inert=!0);p.focus({preventScroll:!0})}return new Promise(P=>{a={kind:M,resolve:P,focus:R,start:performance.now(),elapsed:0};let $=V=>{if(!a||a.kind!==M)return;let k=V-a.start;if(a.elapsed=k,M!=="opening")try{window.myr5Creature?.cinematic(M,k)}catch{_("skipped");return}let Y=Math.min(U.beats.length-1,Math.floor(k/U.duration*U.beats.length));f.textContent!==U.beats[Y]&&(f.textContent=U.beats[Y]),y.style.transform=`scaleX(${Math.min(1,k/U.duration)})`,k>=U.duration?_():o=requestAnimationFrame($)};o=requestAnimationFrame($)})}p.addEventListener("click",()=>_("skipped"));let b=M=>{a&&(M.key==="Escape"?(M.preventDefault(),M.stopImmediatePropagation(),_("skipped")):M.key==="Tab"&&a.kind!=="home"&&(M.preventDefault(),p.focus()))};document.addEventListener("keydown",b,!0);let C=()=>{document.hidden&&_("cancelled")};document.addEventListener("visibilitychange",C);let A=()=>{t.matches&&_("skipped")};t.addEventListener("change",A);let E=document.getElementById("settings");if(E){let M=document.createElement("div");M.className="cinematic-settings";let L=document.createElement("button");L.type="button";let U=()=>{L.textContent=r?"Cinematics on":"Cinematics off",L.setAttribute("aria-pressed",String(r))};U(),L.addEventListener("click",()=>{r=!r;try{localStorage.setItem("myr5-cinematics-v1",r?"on":"off")}catch{}U(),r||_("skipped")});let I=document.createElement("button");I.type="button",I.textContent="Replay opening",I.addEventListener("click",async()=>{if(E.close(),!r){r=!0,U();try{localStorage.setItem("myr5-cinematics-v1","on")}catch{}}await x("opening")}),M.append(L,I),E.append(M)}let N=new MutationObserver(()=>{let M=e.dataset.screen;M!==c&&(c=M,a&&(a.kind==="post"&&M!=="rest"||a.kind!=="post"&&M!=="pod")&&_("cancelled"),M==="pod"&&!a&&x("home"))});N.observe(e,{attributes:!0,attributeFilter:["data-screen"]});let j=setTimeout(async()=>{l||document.hidden||e.dataset.screen!=="pod"||document.querySelector("dialog[open]")||e.dataset.tracking==="true"||a||n(sessionStorage,rp)!=="yes"&&await x("opening")==="cancelled"||!l&&!document.hidden&&!a&&e.dataset.screen==="pod"&&x("home")},150),v=()=>{clearTimeout(j),a?.kind==="home"&&_("skipped")};for(let M of["start","openLibrary","openSettings","openBreathing","visitRest","openIdentity","openAccomplishments"])document.getElementById(M)?.addEventListener("click",v,{capture:!0});return window.addEventListener("pagehide",()=>{l=!0,clearTimeout(j),_("cancelled"),N.disconnect(),document.removeEventListener("keydown",b,!0),document.removeEventListener("visibilitychange",C),t.removeEventListener("change",A)},{once:!0}),{play:x,cancel:()=>_("cancelled"),stats:()=>({active:a?.kind||null,enabled:r,reduced:s()})}}var rp,ap,cp=lt(()=>{rp="myr5-opening-doors-seen-v2",ap={opening:{duration:4800,label:"MOM INC. / POD 005",title:"Something big is waking up.",beats:["CONTAINMENT ONLINE","COACH AWAKENING","MYR5 IS READY"]},home:{duration:2400,label:"TRAINING DECK",title:"Your coach. Your next move.",beats:["WELCOME ABOARD","READY WHEN YOU ARE"]},pre:{duration:3300,label:"MOVEMENT SELECTED",title:"Let\u2019s make it count.",beats:["FIND YOUR SPACE","FIND YOUR FOCUS","LET\u2019S GO"]},post:{duration:3800,label:"SET COMPLETE",title:"You showed up.",beats:["EFFORT RECORDED","TAKE A BREATH","MEET YOUR GIANT"]}}});async function xr(i){let e=i instanceof Uint8Array?i:new Uint8Array(i);if(!globalThis.crypto?.subtle)throw new Error("WebCrypto is required for material chunk verification");return[...new Uint8Array(await crypto.subtle.digest("SHA-256",e))].map(t=>t.toString(16).padStart(2,"0")).join("")}function hp(i,e){try{let t=new URL(i);return(e.trustedOrigins||[]).includes(t.origin)&&(e.allowedProtocols||[]).includes(t.protocol)&&typeof e.pathPrefix=="string"&&t.pathname.startsWith(e.pathPrefix)}catch{return!1}}function ub(i,e=Mo){if(!br(i)||i.schema!=="mom-material-chunks-v1"||!xo(i.packId)||!xo(i.version)||!xo(i.keyId)||!Array.isArray(i.assets)||typeof i.signature!="string")throw new Error("invalid chunk manifest shape");if(!Number.isSafeInteger(e.maxChunkBytes)||e.maxChunkBytes<1||!Array.isArray(e.trustedOrigins)||!Array.isArray(e.allowedProtocols))throw new Error("invalid local resource policy");if(i.assets.length<1||i.assets.length>e.maxAssets)throw new Error("asset count exceeds local policy");let t=new Set,n=0;for(let s of i.assets){if(!br(s)||!cb(s.path)||t.has(s.path)||!Number.isSafeInteger(s.bytes)||s.bytes<1||s.bytes>e.maxAssetBytes||!lp.test(s.sha256)||!Array.isArray(s.chunks)||!s.chunks.length||s.chunks.length>e.maxChunksPerAsset)throw new Error("invalid chunk asset");t.add(s.path),n+=s.bytes;let r=0;for(let a=0;a<s.chunks.length;a++){let o=s.chunks[a];if(!br(o)||o.index!==a||o.offset!==r||!Number.isSafeInteger(o.bytes)||o.bytes<1||o.bytes>e.maxChunkBytes||!lp.test(o.sha256)||!hp(o.url,e)||o.etag!==void 0&&(typeof o.etag!="string"||o.etag.length>512))throw new Error("invalid chunk ordering, URL, or record");r+=o.bytes}if(r!==s.bytes)throw new Error("chunk sizes do not equal asset size")}if(n>e.maxPackBytes)throw new Error("pack exceeds local policy");return!0}async function Bh(i,e,t){if(ub(i,t),!br(e)||e.kty!=="OKP"||e.crv!=="Ed25519")throw new Error("invalid material trust key");let n=globalThis.crypto?.subtle;if(!n)throw new Error("WebCrypto is required for chunk manifest verification");let s=await n.importKey("jwk",e,{name:"Ed25519"},!1,["verify"]);if(!await n.verify({name:"Ed25519"},s,lb(i.signature),rb.encode(hb(i))))throw new Error("chunk manifest signature is invalid");return!0}function up({database:i="mom-material-chunks-v1",storeName:e="chunks"}={}){if(!globalThis.indexedDB)throw new Error("IndexedDB durable storage is required");let t=new Promise((s,r)=>{let a=indexedDB.open(i,1);a.onupgradeneeded=()=>a.result.createObjectStore(e),a.onsuccess=()=>s(a.result),a.onerror=()=>r(a.error)}),n=async(s,r)=>{let a=await t;return new Promise((o,c)=>{let l=a.transaction(e,s),h=l.objectStore(e),u;try{u=r(h)}catch(d){l.abort(),c(d);return}l.oncomplete=()=>o(u?.result),l.onerror=()=>c(l.error||u?.error),l.onabort=()=>c(l.error||new Error("chunk-store transaction aborted"))})};return{async get(s){return n("readonly",r=>r.get(s)).then(r=>r&&new Uint8Array(r))},async put(s,r){return n("readwrite",a=>a.put(new Uint8Array(r),s))},async removePrefix(s){let r=await t;return new Promise((a,o)=>{let c=r.transaction(e,"readwrite"),l=c.objectStore(e).openCursor();l.onsuccess=()=>{let h=l.result;h&&(typeof h.key=="string"&&h.key.startsWith(s)&&h.delete(),h.continue())},c.oncomplete=a,c.onerror=()=>o(c.error)})}}}var rb,lp,ab,ob,br,Fh,xo,cb,lb,Mo,hb,bo,zh=lt(()=>{rb=new TextEncoder,lp=/^[a-f0-9]{64}$/i,ab=/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62})$/,ob=/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/,br=i=>i&&typeof i=="object"&&!Array.isArray(i),Fh=i=>Array.isArray(i)?i.map(Fh):br(i)?Object.fromEntries(Object.keys(i).sort().map(e=>[e,Fh(i[e])])):i,xo=i=>typeof i=="string"&&ab.test(i),cb=i=>typeof i=="string"&&/^assets\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(i)&&!i.includes("..")&&!i.includes("//");lb=i=>Uint8Array.from(typeof atob=="function"?atob(i):Buffer.from(i,"base64").toString("binary"),e=>e.charCodeAt(0)),Mo=Object.freeze({maxChunkBytes:1024*1024,maxAssetBytes:64*1024*1024,maxPackBytes:128*1024*1024,maxAssets:16,maxChunksPerAsset:256,trustedOrigins:Object.freeze(typeof location>"u"?[]:[location.origin]),allowedProtocols:Object.freeze(["https:"]),pathPrefix:"/materials/"}),hb=i=>JSON.stringify(Fh({schema:"mom-material-chunks-v1",packId:i.packId,version:i.version,keyId:i.keyId,assets:i.assets.map(e=>({path:e.path,bytes:e.bytes,sha256:e.sha256,chunks:e.chunks.map(t=>({index:t.index,offset:t.offset,bytes:t.bytes,sha256:t.sha256,url:t.url,etag:t.etag}))}))}));bo=class{constructor({store:e,fetchImpl:t=globalThis.fetch,policy:n=Mo,ownership:s,online:r=()=>!0,expectedVersion:a,manifestPublicKey:o}={}){if(!e?.get||!e?.put||!e?.removePrefix||typeof t!="function")throw new Error("durable chunk store and fetch are required");if(typeof s!="function")throw new Error("explicit authenticated ownership adapter is required");if(!xo(a))throw new Error("authoritative expectedVersion is required");Object.assign(this,{store:e,fetchImpl:t,policy:n,ownership:s,online:r,expectedVersion:a,manifestPublicKey:o}),this.maxAccountedAllocationBytes=0}prefix(e,t){return`material/${t}/${e.packId}/${e.version}/${e.keyId}/`}key(e,t,n,s){return`${this.prefix(e,t)}${n.path}/${s.index}`}async ownerFor(e,t=null){let n=await this.ownership({packId:e.packId,version:e.version});if(typeof n!="string"||!ob.test(n))throw new Error("material is not owned by an authenticated account");if(t&&n!==t)throw new Error("authenticated account changed during material operation");return n}async prepare(e){if(!this.manifestPublicKey)throw new Error("trusted manifest public key is required");if(await Bh(e,this.manifestPublicKey,this.policy),e.version!==this.expectedVersion)throw new Error("replayed or unexpected manifest version");return this.ownerFor(e)}async download(e,{signal:t,retry:n=1}={}){let s=await this.prepare(e);if(!this.online())throw new Error("offline; resume available");let r=0;for(let a of e.assets)for(let o of a.chunks){await this.ownerFor(e,s);let c=this.key(e,s,a,o),l=await this.store.get(c);if(l?.byteLength===o.bytes&&await xr(l)===o.sha256){r+=l.byteLength;continue}l&&await this.store.removePrefix(c);let h;for(let u=0;u<=n;u++){let d;try{if(t?.aborted)throw new Error("download cancelled; resume available");if(await this.ownerFor(e,s),!this.online())throw new Error("offline; resume available");let f=await this.fetchImpl(o.url,{headers:{Range:`bytes=${o.offset}-${o.offset+o.bytes-1}`,...o.etag?{"If-Range":o.etag}:{}},signal:t,redirect:"error"});if(!f.ok||f.status!==206||f.redirected||!hp(f.url||o.url,this.policy))throw new Error(`chunk HTTP/redirect policy failure (${f.status})`);if(o.etag&&f.headers.get("etag")!==o.etag)throw new Error("chunk ETag changed");if(!new RegExp(`^bytes ${o.offset}-${o.offset+o.bytes-1}/\\d+$`).test(f.headers.get("content-range")||""))throw new Error("invalid chunk Content-Range");if(Number(f.headers.get("content-length"))!==o.bytes)throw new Error("chunk response size mismatch");if(d=f.body?.getReader(),!d)throw new Error("streaming response body required");let g=new Uint8Array(o.bytes),y=0,p=0;for(;;){let m=await d.read();if(m.done)break;let _=m.value instanceof Uint8Array?m.value:new Uint8Array(m.value);if(p=Math.max(p,_.byteLength),y+=_.byteLength,y>o.bytes)throw new Error("chunk response too large");g.set(_,y-_.byteLength)}if(this.maxAccountedAllocationBytes=Math.max(this.maxAccountedAllocationBytes,g.byteLength*2+p),y!==o.bytes)throw new Error("chunk response truncated");if(await xr(g)!==o.sha256)throw new Error("chunk hash mismatch");if(t?.aborted)throw new Error("download cancelled; resume available");await this.ownerFor(e,s),await this.store.put(c,g),r+=y,h=null;break}catch(f){if(h=t?.aborted?new Error("download cancelled; resume available"):f,t?.aborted||/ETag|hash|size|cancelled|Content-Range|redirect|account changed/.test(f.message))break}finally{d&&await d.cancel().catch(()=>{})}}if(h)throw h}return{receivedBytes:r,maxAccountedAllocationBytes:this.maxAccountedAllocationBytes,browserMemoryLimitation:"Browser network and stream buffers are implementation-controlled; this bounds only staged chunk, store-copy, and largest read segment, never an asset."}}async verifyStored(e){let t=await this.prepare(e);for(let n of e.assets)for(let s of n.chunks){await this.ownerFor(e,t);let r=await this.store.get(this.key(e,t,n,s));if(!r||r.byteLength!==s.bytes||await xr(r)!==s.sha256)throw new Error(`unverified stored chunk: ${n.path}/${s.index}`)}return{verified:!0,owner:t,guarantee:"canonical signed ordered chunk list"}}async readVerifiedAssets(e){let t=await this.verifyStored(e),n=[];for(let s of e.assets){let r=new Uint8Array(s.bytes);for(let a of s.chunks){let o=await this.store.get(this.key(e,t.owner,s,a));if(!o||o.byteLength!==a.bytes||await xr(o)!==a.sha256)throw new Error(`stored chunk changed: ${s.path}/${a.index}`);r.set(o,a.offset)}if(await xr(r)!==s.sha256)throw new Error(`stored asset aggregate hash mismatch: ${s.path}`);n.push(Object.freeze({path:s.path,bytes:r}))}return Object.freeze(n)}async activate(e,t){if(typeof t!="function")throw new Error("material activation adapter is required");let n=await this.verifyStored(e);return await this.ownerFor(e,n.owner),t({manifest:e,owner:n.owner,prefix:this.prefix(e,n.owner),store:this.store})}async evict(e){let t=await this.prepare(e);await this.store.removePrefix(this.prefix(e,t))}}});function dp(i){let e=i?.entitlements?.coachArmy;return e?.status==="completed"&&Number.isSafeInteger(e.completedAt)&&e.completedAt>0}var sw,rw,fp=lt(()=>{sw=Object.freeze(["/war-room","/warroom","/handborne","/character-editor","/editor"]),rw=Object.freeze(["/handborne/","/war-room","/warroom","/character-editor/","/editor/","/pocket-hardware.css","/hardware-launch.css","/pod/hardware.css","/pod/hardware.mjs","/pod/whiteboard.css"])});function Hh(){return db(null),null}var db,Vh,pp=lt(()=>{db=i=>i&&typeof i=="object"&&i.kty==="OKP"&&i.crv==="Ed25519"&&typeof i.x=="string"&&/^[A-Za-z0-9_-]{43}$/.test(i.x)&&!/^A+$/.test(i.x);Vh=Object.freeze({"liquid-amethyst":Object.freeze({runtimeType:"liquid-v1",parameterKeys:Object.freeze(["hue","strength"])})})});var mp={};vi(mp,{createLiquidPilotRuntime:()=>fb});function fb({host:i,parameters:e={}}={}){if(!i?.ownerDocument)throw new Error("liquid runtime requires an owned host");let t=i.ownerDocument.createElement("canvas");t.width=96,t.height=64,t.className="material-liquid-pilot",i.replaceChildren(t);let n=t.getContext("2d"),s=!1,r=0,a=Number.isFinite(e.hue)?Math.max(250,Math.min(310,e.hue)):278,o=Number.isFinite(e.strength)?Math.max(.1,Math.min(1,e.strength)):.6,c=()=>{if(s||!n)return;let h=n.createRadialGradient(48,32,1,48,32,58);h.addColorStop(0,`hsl(${a-r*18} 85% ${44+r*25}%)`),h.addColorStop(1,`hsl(${a} 72% 10%)`),n.fillStyle=h,n.fillRect(0,0,96,64)},l=h=>{r=o,c(),h.preventDefault?.()};return t.addEventListener("pointerdown",l),c(),Object.freeze({canvas:t,dispose(){s||(s=!0,t.removeEventListener("pointerdown",l),t.remove())},getDebug:()=>({disposed:s,energy:r,hue:a})})}var gp=lt(()=>{});function _p(i){let e=Vh[i?.materialId];return Ns(i)&&i.schema===pb&&typeof i.packId=="string"&&i.packId===i.materialId&&typeof i.version=="string"&&typeof i.minAppVersion=="string"&&yp(i.sha256)&&i.alg==="Ed25519"&&i.keyId==="mom-material-production-v1"&&mb(i.signature)&&e?.runtimeType===i.runtimeType&&Ns(i.parameters)&&Object.keys(i.parameters).every(t=>e.parameterKeys.includes(t))&&Array.isArray(i.assets)&&i.assets.length>0&&i.assets.length<=16&&i.assets.every(gb)&&i.assets.reduce((t,n)=>t+n.bytes,0)<=2*1024*1024}async function vb(i,e){if(!_p(i)||!Ns(e)||e.kty!=="OKP"||e.crv!=="Ed25519")return!1;try{let t=globalThis.crypto?.subtle;if(!t)return!1;let n=await t.importKey("jwk",e,{name:"Ed25519"},!1,["verify"]);return t.verify({name:"Ed25519"},n,_b(i.signature),new TextEncoder().encode(yb(i)))}catch{return!1}}async function xb({fixture:i=null,testTrust:e=null}={}){let t=e?.purpose==="test-only-signed-material"?e.publicKey:i?null:Hh();if(!t)throw new Error("Material unavailable: trusted public configuration is not configured");let n=i?.manifest;if(!i||!await vb(n,t))throw new Error("Material manifest signature is invalid");return{manifest:n,source:i.source}}async function Wh({fixture:i=null,testTrust:e=null}={}){let{manifest:t}=await xb({fixture:i,testTrust:e}),n=i?.chunkManifest;if(!n)throw new Error("Material chunk manifest is unavailable");let s=e?.purpose==="test-only-signed-material"?e.publicKey:Hh();if(await Bh(n,s,i?.policy),n.packId!==t.packId||n.version!==t.version||n.keyId!==t.keyId||n.assets.length!==t.assets.length||n.assets.some((r,a)=>r.path!==t.assets[a].path||r.bytes!==t.assets[a].bytes||r.sha256!==t.assets[a].sha256))throw new Error("signed material metadata is not bound to signed chunk manifest");return{manifest:t,chunkManifest:n,trust:s}}function vp(i){return Object.freeze({getEntitlements(){if(!dp(i))return[];let e=i?.ownedPacks;return Array.isArray(e)?e.filter(t=>t?.status==="owned"&&Number.isSafeInteger(t.grantedAt)&&Vh[t.packId]):[]}})}async function Xh(i,e,t,n){if(!e?.verifiedAssets||!_p(t)||t.materialId!==i)throw new Error("verified stored material data is required");if(t.runtimeType!=="liquid-v1")throw new Error("unknown material runtime");let s=e.verifiedAssets[0];if(!s?.bytes||s.bytes.byteLength>64*1024)throw new Error("material declarative config is missing or too large");let r;try{r=JSON.parse(new TextDecoder().decode(s.bytes))}catch{throw new Error("material declarative config is invalid")}if(!Ns(r)||Object.keys(r).some(o=>!["hue","strength"].includes(o))||Object.values(r).some(o=>typeof o!="number"||!Number.isFinite(o)))throw new Error("material declarative config is invalid");let{createLiquidPilotRuntime:a}=await Promise.resolve().then(()=>(gp(),mp));return a({host:n,parameters:{...t.parameters,...r}})}var pb,yp,mb,Ns,gb,Gh,yb,_b,xp=lt(()=>{fp();Oh();pp();zh();pb="mom-material-pack-v1",yp=i=>typeof i=="string"&&/^[a-f0-9]{64}$/i.test(i),mb=i=>typeof i=="string"&&/^[A-Za-z0-9+/]+={0,2}$/.test(i)&&i.length>=80,Ns=i=>i&&typeof i=="object"&&!Array.isArray(i),gb=i=>Ns(i)&&typeof i.path=="string"&&/^assets\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(i.path)&&!i.path.includes("..")&&!/\.(?:m?js|cjs|html?)$/i.test(i.path)&&Number.isSafeInteger(i.bytes)&&i.bytes>0&&i.bytes<=512*1024&&yp(i.sha256),Gh=i=>{if(Array.isArray(i))return i.map(Gh);if(Ns(i))return Object.fromEntries(Object.keys(i).sort().map(e=>[e,Gh(i[e])]));if(i===null||["string","number","boolean"].includes(typeof i))return i;throw new Error("parameters must be declarative JSON")},yb=i=>JSON.stringify(Gh({schema:i.schema,packId:i.packId,version:i.version,minAppVersion:i.minAppVersion,sha256:i.sha256,alg:i.alg,keyId:i.keyId,materialId:i.materialId,runtimeType:i.runtimeType,parameters:i.parameters,assets:i.assets.map(({path:e,bytes:t,sha256:n})=>({path:e,bytes:t,sha256:n}))}));_b=i=>Uint8Array.from(typeof atob=="function"?atob(i):Buffer.from(i,"base64").toString("binary"),e=>e.charCodeAt(0))});var wp={};vi(wp,{MaterialController:()=>wo,mountMaterialControls:()=>Eb});function Eb({document:i=globalThis.document,account:e,workoutOwner:t,fixture:n,testTrust:s,policy:r,fetchImpl:a,appVersion:o}={}){let c=i?.getElementById("materialControls"),l=i?.getElementById("materialRuntime");if(!c||!l)return null;let h=qh.get(c);if(h)return h;let u=c.querySelector("[data-material-status]"),d=c.querySelector("[data-material-download]"),f=c.querySelector("[data-material-cancel]"),g=c.querySelector("[data-material-equip]"),y=N=>{u.textContent=N.error||`${N.state}${N.totalBytes?` \xB7 ${N.receivedBytes}/${N.totalBytes} bytes`:""}`,d.disabled=!e||N.state==="downloading"||N.pending,f.hidden=N.state!=="downloading",g.disabled=N.state!=="verified"},p;try{p=new wo({account:e,workoutOwner:t,host:l,policy:r,fetchImpl:a,appVersion:o,onChange:y})}catch(N){return y({state:"failed",error:N.message}),null}let m={fixture:n,testTrust:s},_=async()=>(p.bundle||await p.load(m),p),x=async()=>{try{await(await _()).download()}catch(N){y({...p.status(),error:N.message})}},b=async()=>{try{await(await _()).equipAfterRestart(),y({...p.status(),error:"Verified. Reload Coach to activate."})}catch(N){y({...p.status(),error:N.message})}},C=()=>{try{p.assertLive()}catch{p.revoke(),y({...p.status(),error:"Material access changed."})}},A=()=>{p.revoke(),y({...p.status(),error:"Material access changed."})};d.addEventListener("click",x),f.addEventListener("click",()=>p.cancel()),g.addEventListener("click",b),globalThis.addEventListener?.("myr5:account-ready",C),globalThis.addEventListener?.("myr5:account-cleared",A),y(p.status()),_().then(()=>p.restorePending(m)).catch(N=>y({...p.status(),error:N.message}));let E=p.dispose.bind(p);return p.dispose=()=>{d.removeEventListener("click",x),g.removeEventListener("click",b),globalThis.removeEventListener?.("myr5:account-ready",C),globalThis.removeEventListener?.("myr5:account-cleared",A),qh.delete(c),E()},qh.set(c,p),p}var Mp,bb,qh,Mb,wb,Yh,bp,Sb,wo,Sp=lt(()=>{zh();xp();kh();Mp="mom.material-controller.v2",bb=/^[A-Za-z0-9](?:[A-Za-z0-9._:-]{0,127})$/,qh=new WeakMap,Mb=i=>{try{let e=JSON.parse(i.getItem(Mp)||"");return e?.v===2&&e.accounts?e:{v:2,accounts:{}}}catch{return{v:2,accounts:{}}}},wb=i=>i.assets.reduce((e,t)=>e+t.bytes,0),Yh=i=>{let e=i?.user?.id;if(typeof e!="string"||!bb.test(e))throw new Error("a stable authenticated account identity is required");return e},bp=i=>{let e=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.exec(i||"");if(!e)throw new Error("unsupported app version format");return e.slice(1).map(Number)},Sb=(i,e)=>(i=bp(i),e=bp(e),i[0]>e[0]||i[0]===e[0]&&(i[1]>e[1]||i[1]===e[1]&&i[2]>=e[2])),wo=class{constructor({account:e,workoutOwner:t,host:n,storage:s=globalThis.localStorage,chunkStore:r=up(),fetchImpl:a=globalThis.fetch,policy:o,appVersion:c="1.0.0",onChange:l=()=>{},bootId:h}={}){if(!n?.ownerDocument)throw Error("material controls require an application host");Object.assign(this,{account:e,owner:Yh(e),host:n,storage:s,chunkStore:r,fetchImpl:(...u)=>a.call(globalThis,...u),policy:o,appVersion:c,onChange:l,bootId:h||crypto.randomUUID?.()||String(Date.now()),workout:vo({owner:t}),db:Mb(s),runtime:null,abort:null,bundle:null,disposed:!1})}record(){return this.db.accounts[this.owner]||{active:null,candidate:null}}save(){this.storage.setItem(Mp,JSON.stringify(this.db))}status(){let e=this.record(),t=e.candidate||e.active||{};return{state:e.candidate?.state||e.active?.state||"absent",receivedBytes:t.receivedBytes||0,totalBytes:t.chunkManifest?wb(t.chunkManifest):0,error:t.error,pending:e.candidate?.state==="pending-equip",active:!!e.active}}emit(){this.save(),this.onChange(this.status())}owned(e){return vp(this.account).getEntitlements().some(t=>t.packId===e.packId)}assertLive(e=this.bundle?.manifest||this.record().active?.materialManifest){if(this.disposed)throw Error("material controller is disposed");if(Yh(this.account)!==this.owner||e&&!this.owned(e))throw this.runtime?.dispose?.(),this.runtime=null,Error("material ownership was revoked or account changed")}downloader(e=this.bundle){if(!e)throw Error("signed material metadata has not been loaded");let{manifest:t,chunkManifest:n,trust:s}=e;return new bo({store:this.chunkStore,fetchImpl:this.fetchImpl,policy:this.policy||Mo,expectedVersion:t.version,manifestPublicKey:s,ownership:async r=>this.owned(t)&&r.packId===t.packId&&r.version===t.version&&Yh(this.account)===this.owner?this.owner:!1})}async load(e={}){this.assertLive();let t=await Wh(e);if(t.manifest.version!==t.chunkManifest.version||t.manifest.packId!==t.chunkManifest.packId||t.manifest.keyId!==t.chunkManifest.keyId)throw Error("signed metadata and chunk manifest do not identify the same material");if(!Sb(this.appVersion,t.manifest.minAppVersion))throw Error("material requires a newer app version");if(!this.owned(t.manifest))throw Error("material is not owned by this authenticated account");return this.bundle=t,this.status()}putCandidate(e){this.db.accounts[this.owner]={...this.record(),candidate:e},this.emit()}async download(){this.assertLive();let e=this.downloader(),t=this.record().candidate;this.abort=new AbortController,this.putCandidate({state:"downloading",receivedBytes:t?.receivedBytes||0,chunkManifest:this.bundle.chunkManifest,materialManifest:this.bundle.manifest});try{let n=await e.download(this.bundle.chunkManifest,{signal:this.abort.signal});return this.putCandidate({state:"verified",receivedBytes:n.receivedBytes,chunkManifest:this.bundle.chunkManifest,materialManifest:this.bundle.manifest}),this.status()}catch(n){throw this.putCandidate({...this.record().candidate,state:"failed",error:n.message||"download failed"}),n}finally{this.abort=null}}cancel(){this.abort?.abort()}async equipAfterRestart(){this.assertLive();let e=this.record().candidate;if(!this.bundle||e?.state!=="verified")throw Error("only verified material chunks can be equipped");return await this.downloader().verifyStored(this.bundle.chunkManifest),this.putCandidate({...e,state:"pending-equip",bootId:this.bootId}),this.status()}async savedBundle(e,t){if(!e?.materialManifest||!e?.chunkManifest)throw Error("saved material metadata is incomplete");let n=await Wh(t);if(n.manifest.packId!==e.materialManifest.packId||n.manifest.version!==e.materialManifest.version)throw Error("saved material identity is no longer trusted");return n}async activate(e,t){this.assertLive(e.manifest);let n=await this.workout.saveAndConfirmIdle();if(!(n?.saved&&n?.idle))throw Error(n?.reason||"workout save/idle acknowledgment is required before activation");try{let s=await this.downloader(e).readVerifiedAssets(e.chunkManifest),r=await Xh(e.manifest.packId,{verifiedAssets:s},e.manifest,this.host),a=this.runtime;return this.runtime=r,a?.dispose?.(),this.db.accounts[this.owner]={active:{...t,state:"active"},candidate:null},this.emit(),this.status()}finally{n?.release?.()}}async restorePending(e={}){let t=this.record(),n=t.candidate;if(!n)return t.active?this.restoreActive(e):this.status();if(n.state!=="pending-equip"||n.bootId===this.bootId)return this.status();try{let s=this.bundle||await this.savedBundle(n,e);return this.bundle=s,await this.activate(s,n)}catch(s){throw this.putCandidate({...n,state:"pending-equip",error:`activation failed: ${s.message||s}`}),s}}async restoreActive(e={}){let t=this.record().active;if(!t)return this.status();let n=this.bundle||await this.savedBundle(t,e);this.bundle=n,this.assertLive(n.manifest);let s=await this.downloader(n).readVerifiedAssets(n.chunkManifest),r=await Xh(n.manifest.packId,{verifiedAssets:s},n.manifest,this.host),a=this.runtime;return this.runtime=r,a?.dispose?.(),this.status()}revoke(){this.cancel(),this.runtime?.dispose?.(),this.runtime=null,this.db.accounts[this.owner]={active:null,candidate:null},this.emit()}dispose(){this.disposed||(this.disposed=!0,this.cancel(),this.runtime?.dispose?.(),this.runtime=null)}}});Kn();var Op=(i,e,t)=>Math.max(e,Math.min(t,i)),hu=(i,e,t)=>{let n=[i.x-e.x,i.y-e.y,(i.z??0)-(e.z??0)],s=[t.x-e.x,t.y-e.y,(t.z??0)-(e.z??0)],r=Math.hypot(...n)*Math.hypot(...s);return r>1e-8?Math.acos(Op(n.reduce((a,o,c)=>a+o*s[c],0)/r,-1,1))*180/Math.PI:NaN};function uu(i,e,t=null){let n=e.detector==="pushup"?["s","e","w","h"]:["hinge","split","bridge"].includes(e.detector)?["s","h","k"]:e.detector==="plank"?["s","e","w","h","k"]:null,s=Object.entries(i.sides).filter(([_,x])=>(!e.side||e.side===_)&&x.torso>.035&&(!n||i.visible(n.map(b=>x.id[b])))),r=s.find(([_])=>_===t)??s.sort((_,x)=>x[1].coreQuality-_[1].coreQuality)[0],a={valid:!1,up:!1,down:!1,match:!1,metric:0,side:r?.[0]??null,message:e.hint};if(n&&!r)return a;let o=i.sides.left,c=i.sides.right,l=r?.[1]??o,h=Math.max(i.torso,.035),u=e.detector,d=_=>_.every(x=>i.visible([x])&&i.p[x].visibility>=.6),f=(_,x,b)=>{let C=[_,x,b],A=i.world;return A&&C.every(E=>A[E]&&[A[E].x,A[E].y,A[E].z].every(Number.isFinite))?hu(A[_],A[x],A[b]):hu(i.p[_],i.p[x],i.p[b])},g=d([11,12,13,14,15,16,23,24]),y=d([11,12,23,24,25,26]),p=g&&o.w.y<o.s.y-.65*h&&c.w.y<c.s.y-.65*h,m=_=>f(_.id.h,_.id.s,_.id.w);if(n&&!d(n.map(_=>l.id[_])))return a;if(u==="pushup"){if(l.horizontal<(e.incline?.28:.5)||l.w.y<l.s.y+.12*l.torso)return a;let _=f(l.id.s,l.id.e,l.id.w);if(!Number.isFinite(_))return a;a.up=_>150,a.down=_<112,a.metric=(165-_)/60,a.valid=!0}else if(u==="squat"){if(!l.core||(l.h.y-l.s.y)/l.torso<.55)return a;a.valid=!0,a.sample={hipY:l.h.y,torso:l.torso,angle:0},a.metric=l.h.y}else if(u==="split"){if(!i.upright||l.k.y<l.h.y)return a;let _=f(l.id.s,l.id.h,l.id.k);a.valid=Number.isFinite(_),a.up=_>155,a.down=_<135,a.metric=(165-_)/60}else if(u==="hinge"){let _=f(l.id.s,l.id.h,l.id.k);if(l.k.y<l.h.y+.35*l.torso)return a;a.valid=Number.isFinite(_),a.up=_>158,a.down=_<180-(e.bend??45),a.metric=(180-_)/65}else if(u==="bridge"){if(l.horizontal<.5||l.k.y>=l.h.y+.2*l.torso||l.s.y<l.k.y+.1*l.torso)return a;let _=f(l.id.s,l.id.h,l.id.k);a.valid=Number.isFinite(_),a.up=_<145,a.down=_>162,a.metric=(_-125)/50}else if(u==="plank"){let _=f(l.id.s,l.id.h,l.id.k),x=f(l.id.s,l.id.e,l.id.w);a.valid=l.horizontal>.65,a.match=a.valid&&_>155&&l.w.y>l.s.y+.2*l.torso&&(e.forearm?x>60&&x<120:x>145),a.metric=Number(a.match)}else if(u==="sideplank"){let _=e.side==="right"?c:o,x=_.id.k;if(!d([11,12,23,24,_.id.e,x]))return a;let b=Math.abs(o.s.y-c.s.y)>.3*h&&Math.abs(o.s.x-c.s.x)<.5*h;a.valid=!0,a.match=b&&_.horizontal>.7&&f(_.id.s,_.id.h,x)>153&&_.e.y>_.s.y+.15*h,a.metric=Number(a.match)}else if(u==="raise"||u==="press"){if(!g||!i.upright)return a;let _=[f(11,13,15),f(12,14,16)],x=[m(o),m(c)];if(![..._,...x].every(Number.isFinite))return a;a.valid=!0,u==="press"?(a.up=_.every(b=>b<115)&&o.w.y<o.s.y+.2*h&&c.w.y<c.s.y+.2*h,a.down=p&&_.every(b=>b>155)):(a.up=x.every(b=>b<30),a.down=x.every(b=>b>(e.overhead?150:75))&&_.every(b=>b>145)),a.metric=Math.min(...x)/(e.overhead?160:90)}else if(u==="balance"){if(!y||!i.upright)return a;a.valid=!0,a.match=[[o,c],[c,o]].some(([_,x])=>{let b=(x.k.y-_.k.y)/h;return Math.abs(x.k.x-x.h.x)<.55*h&&x.k.y>x.h.y+.5*h&&b>(e.low?.08:.15)&&(e.kneeLift?b>.35:Math.abs(_.k.x-_.h.x)/h>(e.low?.2:.4))&&(!e.overhead||p)}),a.metric=Number(a.match)}else if(u==="yoga"||u==="stance"){if(!y||!i.upright)return a;a.valid=!0;let _=[(o.k.y-o.h.y)/h,(c.k.y-c.h.y)/h],x=Math.abs(o.k.x-c.k.x)/h,b=[o,c].every(E=>Math.abs(E.k.x-E.h.x)<.55*h&&E.k.y>E.h.y+.7*h),C=x>1.4&&[o,c].every(E=>Math.abs(E.k.x-E.h.x)>.5*h)&&_.every(E=>E>.08&&E<(e.high?1.25:e.low?.6:1)),A=x>1.1&&(_[0]<.85&&_[1]>.85||_[1]<.85&&_[0]>.85);u==="stance"?a.match=e.side?A&&_[e.side==="left"?0:1]<.85:C:e.pose==="mountain"?a.match=b&&x<1.2&&g&&o.w.y>o.s.y+.5*h&&c.w.y>c.s.y+.5*h:e.pose==="salute"?a.match=b&&x<1.2&&p:e.pose==="chair"?a.match=_.every(E=>E>.08&&E<.8)&&x<1.2&&p:e.pose==="warrior-one"?a.match=A&&p:e.pose==="warrior"?a.match=A&&g&&o.elbow>145&&c.elbow>145&&Math.abs(o.w.y-o.s.y)<.3*h&&Math.abs(c.w.y-c.s.y)<.3*h&&Math.abs(o.w.x-c.w.x)>2*h:a.match=C&&g&&o.elbow<120&&c.elbow<120&&o.w.y<o.e.y&&c.w.y<c.e.y,a.metric=Number(a.match)}else if(u==="jack"){if(!g||!y||!i.upright)return a;let _=Math.abs(o.k.x-c.k.x)/h,x=m(o),b=m(c);a.valid=!0,a.up=_<1.2&&x<35&&b<35,a.down=_>(e.step?1.3:1.5)&&x>130&&b>130,a.metric=Math.min(_/1.5,x/140,b/140)}return a}var Fp={squat:{name:"Squats",kind:"reps",hint:"Keep shoulders and hips visible. Start standing tall. Feet can stay outside the picture."},pushup:{name:"Push-ups",kind:"reps",hint:"Place the camera beside you. Start at the top with your arm visible."},tree:{name:"Tree pose",kind:"hold",hint:"Show your shoulders, hips and knees. The hold is estimated from your upper-leg position."},warrior:{name:"Warrior II",kind:"hold",hint:"Show your arms, hips and knees. Either direction works; feet are not tracked."},horse:{name:"Horse stance",kind:"hold",hint:"Show your hips and knees in your comfortable wide stance. Feet are not tracked."},boxing:{name:"Air boxing",kind:"pace",hint:"Keep shoulders, elbows and hands visible. Measures time and relative hand pace."},jogging:{name:"Jogging in place",kind:"steps",hint:"Show both knees. Steps are estimated from alternating knee lifts. Keep the phone still."},jumping:{name:"Jumping",kind:"jumps",hint:"Show your shoulders and hips. Jumps are estimated from body rise. Keep the phone still."}},Ct={...Fp,...Rt},Bp={left:{s:11,e:13,w:15,h:23,k:25},right:{s:12,e:14,w:16,h:24,k:26}},du=.75,ko={11:"left shoulder",12:"right shoulder",13:"left elbow",14:"right elbow",15:"left hand",16:"right hand",23:"left hip",24:"right hip",25:"left knee",26:"right knee"},bi=(i,e,t)=>Math.max(e,Math.min(t,i)),Oo=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y,(i.z??0)-(e.z??0)),fu=(i,e)=>({x:(i.x+e.x)/2,y:(i.y+e.y)/2,z:((i.z??0)+(e.z??0))/2});function zp(i,e,t){let n=[i.x-e.x,i.y-e.y,(i.z??0)-(e.z??0)],s=[t.x-e.x,t.y-e.y,(t.z??0)-(e.z??0)],r=Math.hypot(...n)*Math.hypot(...s);return r>1e-8?Math.acos(bi(n.reduce((a,o,c)=>a+o*s[c],0)/r,-1,1))*180/Math.PI:NaN}function Hp(i){let e=[...i].sort((t,n)=>t-n);return e[Math.floor(e.length/2)]}function Vp(i,e=1,t=null){if(!i||i.length<27)return null;for(i=i.map((u,d)=>d>26?{x:0,y:0,visibility:0}:u);i.length<33;)i.push({x:0,y:0,visibility:0});t=t?.map((u,d)=>d>26?null:u)??null;let n=i.map(u=>({x:u.x*e,y:u.y,z:0,visibility:Number.isFinite(u.visibility)?u.visibility:0})),s=u=>n[u]&&Number.isFinite(n[u].x)&&Number.isFinite(n[u].y)&&i[u].x>=-.03&&i[u].x<=1.03&&i[u].y>=-.03&&i[u].y<=1.03,r=u=>u.every(d=>s(d)&&n[d].visibility>=.45),a=u=>u.filter(d=>!r([d])).map(d=>s(d)?`${ko[d]} unclear (${Math.round(n[d].visibility*100)}%)`:`${ko[d]} outside picture`),o={};for(let[u,d]of Object.entries(Bp)){let f=Object.fromEntries(Object.entries(d).map(([y,p])=>[y,n[p]])),g=Oo(f.s,f.h);o[u]={...f,id:d,torso:g,core:r([d.s,d.h])&&g>.035,coreQuality:Math.min(n[d.s].visibility,n[d.h].visibility),arm:r([d.s,d.e,d.w,d.h])&&g>.035,armQuality:Math.min(...[d.s,d.e,d.w,d.h].map(y=>n[y].visibility)),elbow:zp(f.s,f.e,f.w),horizontal:Math.abs(f.s.x-f.h.x)/Math.max(g,.035)}}let c=(o.left.torso+o.right.torso)/2,l=fu(n[23],n[24]),h=fu(n[11],n[12]);return{p:n,world:t,visible:r,issues:a,sides:o,torso:c,hip:l,shoulder:h,upright:(l.y-h.y)/Math.max(c,.035)>.65,knees:r([11,12,23,24,25,26])&&c>.035}}var Fs=class{constructor(e="squat",t={}){this.reset(e,t)}reset(e=this.mode,t={}){if(!Ct[e])throw new Error("Unknown movement");return this.mode=e,this.duration=Number(t.duration)||0,this.count=0,this.elapsed=0,this.hold=0,this.totalHold=0,this.bestHold=0,this.active=0,this.speed=0,this.bestSpeed=0,this.started=null,this.last=null,this.complete=!1,this.eventTimes=[],this.side=null,this.calibration=[],this.base=null,this.filtered={},this.phase="ready",this.phaseSince=null,this.lastRep=-1/0,this.candidate=null,this.missAt=null,this.previousMatch=!1,this.hands={},this.kneeArmed={left:!1,right:!1},this.lastStep=-1/0,this.message=Ct[e].hint,this.measurement="",this.tracking=!1,this.progress=0,this.setupProgress=0,this.setupReason="",this.jointReadings="",this.snapshot()}smooth(e,t,n){let s=this.filtered[e],r=1-Math.exp(-Math.max(n,.01)/.085);return this.filtered[e]=s===void 0?t:s+(t-s)*r}lose(e,t="Keep the needed joints in view."){this.tracking=!1,this.message=t,this.measurement="Tracking paused",this.phase="ready",this.phaseSince=null,this.filtered={},this.calibration=[],this.setupProgress=0,this.progress=0,this.kneeArmed={left:!1,right:!1},this.hands={},this.speed=0,this.previousMatch=!1,this.candidate=null,this.missAt===null&&(this.missAt=e),e-this.missAt>.35&&(this.hold=0)}selectSide(e,t,n){let s=Object.entries(e.sides).filter(([,o])=>o[t]);if(!s.length){let o=l=>t==="core"?[l.id.s,l.id.h]:[l.id.s,l.id.e,l.id.w,l.id.h],c=Object.values(e.sides).map(l=>({s:l,issues:e.issues(o(l))})).sort((l,h)=>l.issues.length-h.issues.length)[0];return this.lose(n,c.issues.length?"Counting paused: "+c.issues.slice(0,2).join("; ")+".":"Move a little closer so your torso is clear."),null}let r=t==="core"?"coreQuality":"armQuality",a=s.find(([o])=>o===this.side)||s.sort((o,c)=>c[1][r]-o[1][r])[0];return this.side!==a[0]&&(this.side=a[0],this.base=null,this.calibration=[],this.phase="ready",this.phaseSince=null,this.filtered={}),a[1]}calibrate(e,t,n){if(!t)return this.calibration=[],this.setupProgress=0,this.setupReason="Starting position not yet detected",!1;if(this.calibration.push({t:n,...e}),this.calibration=this.calibration.filter(a=>n-a.t<=1.1),this.setupProgress=Math.min(1,this.calibration.length/3,(n-this.calibration[0].t)/.7),this.setupReason="Hold steady",this.calibration.length<3||n-this.calibration[0].t<.7)return!1;let s=e.hipY!==void 0?"hipY":"angle",r=this.calibration.map(a=>a[s]);return Math.max(...r)-Math.min(...r)>(s==="angle"?12:.025)?(this.setupProgress=0,this.setupReason="Waiting for a steadier starting position",!1):(this.base=Object.fromEntries(Object.keys(e).map(a=>[a,Hp(this.calibration.map(o=>o[a]))])),this.calibration=[],this.setupProgress=1,this.setupReason="Ready",this.phase="top",this.phaseSince=null,!0)}repetition(e,t,n,s,r=.1){if(this.phase==="ready"){t&&(this.phase="top",this.phaseSince=null);return}this.phase==="top"?e?(this.phaseSince===null&&(this.phaseSince=n),n-this.phaseSince>=r&&(this.phase="bottom",this.phaseSince=null,this.downAt=n)):this.phaseSince=null:this.phase==="bottom"&&(t?(this.phaseSince===null&&(this.phaseSince=n),n-this.phaseSince>=.1&&n-this.downAt>=s&&n-this.lastRep>=.45&&(this.count++,this.lastRep=n,this.eventTimes.push(n),this.phase="top",this.phaseSince=null)):this.phaseSince=null)}recipeUpdate(e,t,n){let s=Ct[this.mode],r=uu(e,s,this.side);if(!r.valid){this.lose(t,r.message);return}if(r.side&&this.side!==r.side&&(this.side=r.side,this.base=null,this.calibration=[],this.phase="ready",this.phaseSince=null,this.filtered={}),this.tracking=!0,s.kind==="hold")r.match?(this.candidate===null&&(this.candidate=t),t-this.candidate>=.45&&this.previousMatch&&(this.hold+=n,this.totalHold+=n,this.bestHold=Math.max(this.bestHold,this.hold)),this.previousMatch=!0,this.missAt=null):(this.previousMatch=!1,this.candidate=null,this.hold=0),this.progress=Number(r.match),this.message=r.match?"Position detected. Hold comfortably.":"Hold paused. "+s.hint;else{let a=r.up,o=r.down;if(s.detector==="squat")if(this.base){let c=this.smooth("recipeMetric",(r.sample.hipY-this.base.hipY)/this.base.torso,n);o=c>=(s.travel??.25),a=c<=.09,this.progress=bi(c/.5,0,1)}else a=!0;else this.progress=bi(r.metric,0,1);this.base?(this.repetition(o,a,t,s.minCycle??.18,s.dwell??.1),this.message=this.phase==="bottom"?"Return to your starting position.":"Move with control. Complete the full return to count."):(this.calibrate(r.sample??{angle:0},a,t),this.message=this.base?"Ready. Begin when you are ready.":s.hint+" Hold the starting position briefly.",this.progress=this.setupProgress)}this.measurement=s.measurement+" \xB7 "+s.limits}repUpdate(e,t,n){let s=this.mode==="squat",r=this.selectSide(e,s?"core":"arm",t);if(!r)return;if(!s&&r.horizontal<.5){this.lose(t,"Place the camera beside you so it can see your push-up position.");return}this.tracking=!0;let a=this.smooth("angle",s?180:r.elbow,n),o=this.smooth("hipY",r.h.y,n);if(!this.base){let d=s?(r.h.y-r.s.y)/r.torso>.65:a>145&&r.horizontal>=.5,f=this.calibrate(s?{hipY:o,torso:r.torso,angle:a}:{angle:a},d,t);this.message=f?"Ready. Begin when you are ready.":d?this.setupReason==="Hold steady"?`Setting start: ${Math.round(this.setupProgress*100)}%. Hold still briefly.`:this.setupReason+".":s?"Start standing tall with your shoulders and hips visible.":"Start at the top with your arm extended.",this.progress=this.setupProgress,this.measurement=`${this.side} side \xB7 ${Math.round(a)}\xB0`;return}let c=s?0:this.base.angle-a,l=s?(o-this.base.hipY)/this.base.torso:0,h=s?l>=.25:c>=35,u=s?l<=.1:c<=14;this.repetition(h,u,t,.18),this.message=this.phase==="bottom"?"Movement registered. Return to your starting position.":this.phase==="ready"?"Return to your starting position to resume.":"Ready for the next repetition.",this.progress=bi(s?Math.max(c/40,l/.5):c/50,0,1),this.measurement=s?`${this.side} hip \xB7 travel ${Math.max(0,l).toFixed(2)} \xB7 torso only`:`${this.side} arm \xB7 bend ${Math.round(c)}\xB0`}holdUpdate(e,t,n){if(!e.knees){this.lose(t,"Hold paused: "+(e.issues([11,12,23,24,25,26]).slice(0,2).join("; ")||"move a little closer")+". Feet do not need to be visible.");return}this.tracking=!0;let s=e.sides.left,r=e.sides.right,a=Math.abs(s.k.x-r.k.x)/e.torso,o=!1,c="";if(this.mode==="tree")for(let[l,h,u]of[[s,r,"Left leg raised"],[r,s,"Right leg raised"]]){let d=Math.abs(l.k.x-l.h.x)/e.torso,f=Math.abs(h.k.x-h.h.x)/e.torso;if(e.upright&&d>.4&&f<.55&&(h.k.y-l.k.y)/e.torso>.15){o=!0,c=u+" \xB7 estimated from upper legs";break}}else if(this.mode==="warrior"){let l=e.visible([11,12,13,14,15,16])&&s.elbow>140&&r.elbow>140&&Math.abs(s.w.y-s.s.y)/e.torso<.4&&Math.abs(r.w.y-r.s.y)/e.torso<.4&&Math.abs(s.w.x-r.w.x)/e.torso>2.2,h=(s.k.y-s.h.y)/e.torso,u=(r.k.y-r.h.y)/e.torso;o=e.upright&&a>1.15&&l&&(h<.85&&u>.85||u<.85&&h>.85),c="Arms and upper-leg stance \xB7 estimated hold"}else o=e.upright&&a>1.5&&Math.abs(s.k.x-s.h.x)/e.torso>.5&&Math.abs(r.k.x-r.h.x)/e.torso>.5&&(s.k.y-s.h.y)/e.torso<1&&(r.k.y-r.h.y)/e.torso<1,c="Wide upper-leg stance \xB7 estimated hold";o?(this.missAt!==null&&t-this.missAt>.35&&(this.hold=0),this.missAt=null,this.candidate===null&&(this.candidate=t),t-this.candidate>=.45?(this.previousMatch&&(this.hold+=n,this.totalHold+=n,this.bestHold=Math.max(this.bestHold,this.hold)),this.message="Pose detected. Hold at your own comfort level."):this.message="Position found. Hold steady\u2026",this.previousMatch=!0,this.measurement=c):(this.missAt===null&&(this.missAt=t),t-this.missAt>.35&&(this.hold=0,this.candidate=null),this.previousMatch=!1,this.message="Hold timer paused. Reposition if needed.",this.measurement=Ct[this.mode].hint),this.progress=o?1:0}boxingUpdate(e,t,n){let s=Ct[this.mode].side,r=Object.entries(e.sides).filter(([l,h])=>h.arm&&(!s||s===l));if(!r.length){this.selectSide(e,"arm",t);return}this.tracking=!0;let a=[],o={};for(let[l,h]of r){let u=e.world,d=h.id,f=u&&[d.s,d.w,d.h].every(b=>u[b]&&Number.isFinite(u[b].x)&&Number.isFinite(u[b].y)&&Number.isFinite(u[b].z)),g=f?u[d.w]:h.w,y=f?u[d.s]:h.s,p=f?u[d.h]:h.h,m=Math.max(Oo(y,p),.035),_={x:(g.x-y.x)/m,y:(g.y-y.y)/m,z:((g.z??0)-(y.z??0))/m},x=this.hands[l];if(x&&x.world===!!f&&n>.005){let b=Oo(_,x.point)/n;b<20&&a.push(b)}o[l]={point:_,world:!!f}}this.hands=o;let c=a.length?Math.max(...a):0;this.speed+=(c-this.speed)*(1-Math.exp(-n/.25)),this.speed>.7&&(this.active+=n),this.bestSpeed=Math.max(this.bestSpeed,this.speed),this.message=this.speed>.7?"Movement detected. Keep your own rhythm.":"Active timer paused. Move your hands when ready.",this.measurement="Hand pace is relative to torso length. No punch-accuracy score.",this.progress=bi(this.speed/5,0,1)}jogUpdate(e,t,n){if(!e.knees){this.lose(t,"Steps paused: "+(e.issues([11,12,23,24,25,26]).slice(0,2).join("; ")||"move a little closer")+". Feet are not tracked.");return}this.tracking=!0;let s=e.sides.left,r=e.sides.right;for(let[a,o,c]of[["left",s,r],["right",r,s]]){let l=this.smooth(a+"Lift",(c.k.y-o.k.y)/e.torso,n);l<.05&&(this.kneeArmed[a]=!0),this.kneeArmed[a]&&l>(Ct[this.mode].lift??.13)&&t-this.lastStep>.17&&(this.count++,this.eventTimes.push(t),this.lastStep=t,this.kneeArmed[a]=!1)}this.message="Counting alternating knee lifts.",this.measurement="Estimated steps from knees; feet are not tracked.",this.progress=bi(Math.abs(s.k.y-r.k.y)/e.torso/.3,0,1)}jumpUpdate(e,t,n){let s=this.selectSide(e,"core",t);if(!s)return;this.tracking=!0;let r=this.smooth("hip",s.h.y,n),a=this.smooth("shoulder",s.s.y,n);if(!this.base){this.calibrate({hipY:r,shoulder:a,torso:s.torso},(s.h.y-s.s.y)/s.torso>.65,t),this.message=this.base?"Ready. Begin when you are ready.":`Setting start: ${Math.round(this.setupProgress*100)}%. Stand still briefly.`,this.progress=this.setupProgress;return}if(Math.abs(s.torso/this.base.torso-1)>.3){this.base=null,this.calibration=[],this.phase="ready",this.message="Distance changed. Stand still to reset your start.";return}let o=(this.base.hipY-r)/this.base.torso,c=(this.base.shoulder-a)/this.base.torso;this.phase==="ready"&&o<.07&&(this.phase="top"),this.phase==="top"&&o>.16&&c>.12?(this.phase="air",this.airAt=t):this.phase==="air"&&o<.07&&(t-this.airAt>.12&&t-this.lastRep>.35&&(this.count++,this.eventTimes.push(t),this.lastRep=t),this.phase="top"),this.message=this.phase==="air"?"Body rise detected. Return to your starting height.":"Ready for the next estimated jump.",this.measurement="Estimated from body rise; landing cannot be verified without feet.",this.progress=bi(o/.4,0,1)}update(e,t,n=1,s=null){let r=t/1e3;if(!Number.isFinite(r))return this.snapshot();if(this.last!==null&&r<=this.last)return this.snapshot();let a=this.last===null?0:r-this.last,o=a>du?0:a;if(this.last=r,this.complete)return this.snapshot();let c=Vp(e,n,s);if(this.jointReadings=c?Object.entries(c.sides).map(([h,u])=>`${h}: `+[u.id.s,u.id.h,u.id.k].map(d=>`${ko[d].split(" ")[1]} ${Math.round(c.p[d].visibility*100)}%${c.visible([d])?"":" \xD7"}`).join(", ")).join(" | "):"No body landmarks",this.started===null&&c&&Object.values(c.sides).some(h=>h.core||h.arm)&&(this.started=r),this.elapsed=this.started===null?0:r-this.started,this.duration>0&&this.elapsed>=this.duration)return this.elapsed=this.duration,this.complete=!0,this.message="Round complete.",this.snapshot();if(a>du&&(this.lose(r),this.phase="ready",this.hold=0,this.candidate=null),!c)return this.lose(r,"No body found. Step into view."),this.snapshot();let l=Ct[this.mode];return this.mode==="squat"||this.mode==="pushup"?this.repUpdate(c,r,o):["tree","warrior","horse"].includes(this.mode)?this.holdUpdate(c,r,o):l.detector==="boxing"?this.boxingUpdate(c,r,o):l.detector==="march"?this.jogUpdate(c,r,o):Rt[this.mode]?this.recipeUpdate(c,r,o):this.jumpUpdate(c,r,o),this.snapshot()}snapshot(){let e=Math.min(10,this.elapsed),t=this.last??0;return this.eventTimes=this.eventTimes.filter(n=>t-n<=10),{mode:this.mode,name:Ct[this.mode].name,kind:Ct[this.mode].kind,count:this.count,elapsed:this.elapsed,remaining:this.duration?Math.max(0,this.duration-this.elapsed):null,hold:this.hold,totalHold:this.totalHold,bestHold:this.bestHold,active:this.active,speed:this.speed,bestSpeed:this.bestSpeed,cadence:e>=2?this.eventTimes.length*60/e:0,complete:this.complete,tracking:this.tracking,calibrated:!!this.base,setupProgress:this.setupProgress,phase:this.phase,message:this.message,measurement:this.measurement,progress:this.progress,side:this.side,jointReadings:this.jointReadings}}};Kn();function pu(i){let e=i.detector,t=i.side?`${i.side} side`:"near side",n=["Shoulders","Hips","Both knees"];e==="pushup"?n=["Shoulder","Elbow","Wrist","Hip"]:e==="squat"||i.id==="jumping"?n=["Shoulders","Hips"]:["hinge","split","bridge"].includes(e)?n=["Shoulder","Hip","Knee"]:e==="plank"?n=["Shoulder","Elbow","Wrist","Hip","Knee"]:e==="sideplank"?n=["Both shoulders","Both hips","Supporting elbow","Supporting knee"]:["raise","press","boxing"].includes(e)?n=["Both shoulders","Both elbows","Both wrists","Hips"]:(e==="yoga"||e==="jack"||e==="balance"&&i.overhead)&&(n=["Shoulders","Elbows","Wrists","Hips","Both knees"]);let s=["bridge","plank","sideplank"].includes(e)||e==="pushup"&&!i.incline,r=e==="sideplank"?"Chest toward camera":i.view==="side"?"Side view":i.view==="angle"?"Slight angle":"Front view",a=s?"Phone low \xB7 steady support":"Phone at waist height \xB7 steady support",o=["pushup","hinge","split","bridge","plank"].includes(e)?`${t[0].toUpperCase()+t.slice(1)} clear \xB7 room to move`:"Keep these in frame as you move.";return{position:r,placement:a,framing:o,joints:n,feet:"Feet and ankles are not tracked."}}Kn();var mu={chest:["crossbow","cannon"],legs:["greatsword","hammer"],hips:["scythe","halberd"],core:["mace","tome"],shoulders:["bow","trident"],balance:["axe","sabre"],yoga:["staff","wand"],stances:["dagger","spear"],boxing:["gauntlets","rapier"],cardio:["chakram","flail"]},gu=Object.freeze(Object.fromEntries(wt.map(i=>[i.id,Object.freeze({id:i.id,name:i.name,weapons:Object.freeze(mu[i.id])})]))),Ub=Object.freeze(Object.fromEntries(Object.entries(mu).flatMap(([i,e])=>e.map(t=>[t,i]))));function yu(i,e){let t=i?.training?.[e];return i?.trainingVersion!==1||!t||!Number.isSafeInteger(t.activeDays)||t.activeDays<0||!Number.isSafeInteger(t.completedSets)||t.completedSets<t.activeDays||t.completedSets>1e6?{activeDays:0,completedSets:0,totalXp:0,strength:1}:{activeDays:t.activeDays,completedSets:t.completedSets,totalXp:t.activeDays*100,strength:1+Math.floor(t.completedSets/4)}}function _u(i,e){let t={},n=document.createElement("section");n.className="training-rewards",n.setAttribute("aria-label","Category weapon rewards"),i.after(n);function s(){let r=e(),a=gu[r],o=window.GalaWeapons;if(!a||!o)return;let c=yu(t,r);n.replaceChildren();let l=document.createElement("p");l.textContent=`${a.name} \xB7 ${c.totalXp.toLocaleString()} XP`,n.append(l);let h=document.createElement("div");h.className="training-reward-weapons";for(let f of a.weapons){let g=0;for(let _=1;_<o.tiers.length;_++)o.unlocked({type:f,tier:_},t)&&(g=_);let y=document.createElement("div"),p=document.createElement("canvas"),m=document.createElement("span");p.width=80,p.height=144,p.setAttribute("aria-hidden","true"),o.draw(p.getContext("2d"),{type:f,tier:g},{scale:2}),m.textContent=o.types.find(_=>_.id===f).name,y.append(p,m),h.append(y)}n.append(h);let u=o.tiers.findIndex((f,g)=>!o.unlocked({type:a.weapons[0],tier:g},t)),d=document.createElement("small");d.textContent=u<0?"Fully evolved":`+100 XP per completed ${a.name} day \xB7 Next: ${o.requirements({type:a.weapons[0],tier:u}).xp} XP`,n.append(d)}return window.addEventListener("myr5:account-progress",r=>{t=r.detail,s()}),s(),{paint:s}}var he=i=>document.getElementById(i);function Sf({movements:i,onOpen:e,onSelect:t,onStart:n,camera:s,movement:r,voice:a}){let o=he("library"),c=null,l=null,h=0,u=0,d=0,f=null,g=null,y=!1,p="squat",m=0,_="legs",x=_u(he("libraryFocus").closest("label"),()=>_);for(let R of wt){let P=document.createElement("option");P.value=R.id,P.textContent=R.name,he("libraryFocus").append(P)}he("libraryFocus").addEventListener("change",()=>{_=he("libraryFocus").value,m=0,v(),x.paint()});let b=(R,P={})=>a.say(R,P);function C(){d++,y=!1,clearTimeout(f),g?.(),g=null,a.cancel(),he("introCue").hidden=!0}function A(){h++,l?.dispose(),l=null}function E(R="Hold thumbs up to confirm."){u++,c?.stop(),c=null,he("toggleHands").disabled=!1,he("toggleHands").textContent="Enable exercise gestures",he("toggleHands").setAttribute("aria-pressed","false"),he("handState").textContent=R,he("confirmProgress").value=0}function N(R){R==="jumping"&&(R="jumping-jack"),p=R,he("startFromLibrary").textContent="Start "+i[R].name;for(let P of he("movementCards").querySelectorAll("[data-movement]"))P.setAttribute("aria-pressed",String(P.dataset.movement===R))}function j(){o.dataset.preview="false",_=Gi(p),he("libraryFocus").value=_,m=Math.max(0,Math.floor(xi[_].findIndex(R=>R.id===p)/4)),v(),C(),A(),he("movementCards").hidden=!1,he("startFromLibrary").hidden=!0,he("hologramPanel").hidden=!0,he("gestureArea").hidden=!1,o.scrollTop=0,o.open&&he("movementCards").querySelector(`[data-movement="${p}"]`)?.focus()}for(let[R,P]of Object.entries(Rt)){let $=document.createElement("article");$.className="movement-card",$.dataset.group=Gi(R);let V=document.createElement("button");V.className="card-select",V.dataset.movement=R,V.setAttribute("aria-pressed","false"),V.setAttribute("aria-label",P.name),V.title=P.name;let k=document.createElement("img");k.src=`/models/previews/${R}.png`,k.alt="",k.width=512,k.height=512,k.loading="lazy",k.decoding="async",V.append(k),V.addEventListener("click",()=>{C(),M(R),b(P.name,{interrupt:!0})}),$.append(V),he("movementCards").append($)}function v(){x.paint();for(let R of he("movementCards").children)R.hidden=R.dataset.group!==_;he("libraryPages").hidden=!0}he("previousPage").addEventListener("click",()=>{m--,v()}),he("nextPage").addEventListener("click",()=>{m++,v()}),he("libraryFocus").value=_,v();async function M(R){R==="jumping"&&(R="jumping-jack");let P=pu(Rt[R]);he("holoCameraPosition").textContent=P.position,he("holoCameraPlacement").textContent=P.placement;let $={pushup:"point at your upper arm",squat:"hands on hips",tree:"hands together overhead",warrior:"arms out in a T",horse:"hands at your chest",boxing:"two fists at your shoulders",jogging:"pump arms \xD74","jumping-jack":"hands raised apart"};he("holoFrameNote").textContent=P.framing+($[R]?` Gesture: ${$[R]}.`:""),he("holoVisibleJoints").replaceChildren(...P.joints.map(k=>{let Y=document.createElement("li");return Y.textContent=k,Y})),he("holoStage").setAttribute("aria-label",`${i[R].name} example. ${P.position}. Drag to rotate.`),o.dataset.preview="true",E(),A();let V=h;N(R),t(R),he("movementCards").hidden=!0,he("libraryPages").hidden=!0,he("startFromLibrary").hidden=!0,he("gestureArea").hidden=!0,he("hologramPanel").hidden=!1,he("holoName").textContent=i[R].name,he("holoStatus").hidden=!1,he("holoStatus").textContent="Loading hologram\u2026",he("holoPlay").textContent="Pause animation",he("useHologram").disabled=!1,he("useHologram").textContent="Begin",o.scrollTop=0,he("backLibrary").focus();try{let{createHologram:k}=await Promise.resolve().then(()=>(yf(),gf));if(V!==h||!o.open)return!1;let Y=await k(he("holoStage"),R);return V!==h||!o.open?(Y.dispose(),!1):(l=Y,he("holoStatus").hidden=!0,he("useHologram").disabled=!1,!0)}catch(k){return V===h&&(he("holoStatus").textContent="Hologram could not load. "+k.message,he("useHologram").textContent="Begin",he("useHologram").disabled=!1),!1}}function L(){C(),E(),A(),o.close(),n()}async function U(R=r()){R==="jumping"&&(R="jumping-jack"),e(),C(),E(),N(R),t(R),o.open||o.showModal(),y=!0,await M(R)}function I(R){he("confirmProgress").value=R.progress,R.event==="proposed"?(N(R.mode),he("handState").textContent=i[R.mode].name+"? Hold thumbs up to confirm.",b(i[R.mode].name+"? Hold thumbs up to confirm.",{interrupt:!0})):R.event==="holding"?he("handState").textContent=`Hold thumbs up\u2026 ${Math.round(R.progress*100)}%`:R.event==="pending"?he("handState").textContent=i[R.mode].name+"? Hold thumbs up for a moment.":R.event==="confirmed"?(E(),U(R.mode)):R.event==="expired"?(he("handState").textContent="Selection expired. Make another gesture.",b("Selection cancelled. Make another gesture.",{interrupt:!0})):R.event==="idle"&&(he("handState").textContent="Make an exercise gesture.")}return he("toggleHands").addEventListener("click",async()=>{if(c){E(),b("Exercise gestures off.",{interrupt:!0});return}let R=++u;he("toggleHands").disabled=!0,he("handState").textContent="Opening exercise gestures\u2026",b("Exercise gestures. Show your gesture, then hold thumbs up to confirm.",{interrupt:!0});try{let{HandControl:P}=await Promise.resolve().then(()=>(wf(),Mf));if(R!==u||!o.open)return;let $=new P({video:he("handVideo"),camera:s(),message:V=>he("handState").textContent=V,onGesture:I,onError:V=>E(V)});if(c=$,await $.start(),R!==u||!o.open){$.stop();return}he("toggleHands").disabled=!1,he("toggleHands").textContent="Disable exercise gestures",he("toggleHands").setAttribute("aria-pressed","true")}catch(P){R===u&&(E(P.message),b("Gesture tracking unavailable. Touch controls are ready.",{interrupt:!0}))}}),he("startFromLibrary").addEventListener("click",()=>U(p)),he("closeLibrary").addEventListener("click",()=>{C(),o.close(),b("Library closed.",{interrupt:!0})}),he("backLibrary").addEventListener("click",()=>{j(),b("Movements.",{interrupt:!0})}),he("useHologram").addEventListener("click",()=>L()),he("holoReset").addEventListener("click",()=>{l?.reset(),y||b("View reset.")}),he("zoomIn").addEventListener("click",()=>{l?.zoom(.85),y||b("Closer.")}),he("zoomOut").addEventListener("click",()=>{l?.zoom(1.18),y||b("Further away.")}),he("holoPlay").addEventListener("click",()=>{if(l){y&&C();let R=l.toggle();he("holoPlay").textContent=R?"Pause animation":"Play animation",he("useHologram").textContent="Begin",b(R?"Example playing.":"Example paused.")}}),o.addEventListener("cancel",C),o.addEventListener("close",()=>{E(),A(),he("movementRow").focus()}),document.addEventListener("visibilitychange",()=>{document.hidden&&o.open&&(C(),E("Gestures paused"),A(),j())}),window.addEventListener("pagehide",()=>{C(),E(),A()}),{introduce:U}}var Ef="dfbcf93b5fdce3070340";var Ah="/voice/manifest.json?v="+Ef;function Fx(i,e){if(i=i.trim(),e[i])return[i];let t=(i.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)||[]).map(n=>n.trim()).filter(Boolean);return t.length&&t.every(n=>e[n])?t:[]}var ro=class{constructor(e=()=>{}){this.onMode=e,this.context=null,this.cache=new Map,this.cacheBytes=0,this.current=null,this.generation=0}unlock(){let e=globalThis.AudioContext||globalThis.webkitAudioContext;if(!e)return!1;try{return this.context??=new e,this.context.state==="suspended"&&this.context.resume().catch(()=>{}),!0}catch{return!1}}stop(){this.generation++;let e=this.current;if(this.current=null,e){e.abort?.abort();try{e.source?.stop()}catch{}e.finish?.()}this.onMode("Deep robot voice")}async play(e){if(!this.unlock())return!1;let t=++this.generation,n=new AbortController;this.current={abort:n};let s;try{s=setTimeout(()=>n.abort(),5e3),this.manifest??=fetch(Ah,{signal:n.signal}).then(o=>{if(!o.ok)throw Error("Voice pack unavailable");return o.json()}).catch(o=>{throw this.manifest=null,o});let r=await this.manifest,a=Fx(e,r.phrases);if(clearTimeout(s),!a.length)throw Error("No approved clip");for(let o of a){if(t!==this.generation)return!0;let c=this.cache.get(o);if(!c){s=setTimeout(()=>n.abort(),5e3);let h=await fetch(r.phrases[o],{signal:n.signal});if(!h.ok)throw Error("Voice unavailable");let u=await h.arrayBuffer();if(clearTimeout(s),t!==this.generation||(c=await this.context.decodeAudioData(u),t!==this.generation))return!0;let d=c.length*c.numberOfChannels*4;for(;this.cache.size&&this.cacheBytes+d>12*1024*1024;){let f=this.cache.keys().next().value,g=this.cache.get(f);this.cacheBytes-=g.length*g.numberOfChannels*4,this.cache.delete(f)}this.cache.set(o,c),this.cacheBytes+=d}if(this.context.state!=="running")return this.onMode("Tap Test voice to enable sound"),this.current=null,!1;let l=this.context.createBufferSource();l.buffer=c,l.connect(this.context.destination),this.onMode("Deep robot voice"),await new Promise(h=>{let u=!1,d=()=>{u||(u=!0,l.disconnect(),t===this.generation&&(this.current={abort:n}),h())};this.current={source:l,abort:n,finish:d},l.onended=d,l.start()})}return t===this.generation&&(this.current=null),!0}catch{return t===this.generation?(this.current=null,this.onMode("Voice unavailable \xB7 captions on"),!1):!0}finally{clearTimeout(s)}}};function Th(i){typeof window<"u"&&window.dispatchEvent(new CustomEvent("myr5:response",{detail:{state:i}}))}var ao=class{constructor(){this.reset()}reset(){this.previous=null,this.ready=!1,this.lostAt=null,this.warned=!1,this.marks=new Set,this.lastEncourage=0,this.nextSetup=null}update(e,t){let n=[],s=this.previous,r=(o,c="guide")=>n.push({text:o,key:c}),a=e.tracking&&(e.kind==="hold"?e.progress===1:!["squat","pushup","jumping"].includes(e.mode)||e.calibrated);if(e.complete)s?.complete||r("Round complete. Well done.","complete");else{if(a&&!this.ready&&(r("Ready. Begin.","ready"),this.ready=!0),this.ready||(this.nextSetup??=t+6e3,t>=this.nextSetup&&(r(e.message,"setup"),this.nextSetup=t+8e3)),this.ready&&!e.tracking?(this.lostAt??=t,!this.warned&&t-this.lostAt>=2e3&&(r(e.message,"tracking"),this.warned=!0)):e.tracking&&(this.warned&&r("I can see you again.","tracking"),this.lostAt=null,this.warned=!1),s&&e.count>s.count&&r(String(e.count),"count"),e.kind==="hold"&&s){let o=Math.floor(e.hold/10)*10;e.remaining==null&&o>=10&&o>Math.floor(s.hold/10)*10&&r(`${o} seconds.`,"time"),s.hold>1&&e.hold===0&&r("Hold paused.","tracking")}if(e.remaining!==null&&s?.remaining!==null&&s?.remaining!==void 0){let o=[60,30,10,5,4,3,2,1].filter(c=>s.remaining>c&&e.remaining<=c&&!this.marks.has(c));if(o.forEach(c=>this.marks.add(c)),o.length){let c=o.at(-1);r(c>5?`${c} seconds left.`:String(c),"time")}}else a&&e.kind!=="hold"&&Math.floor(e.elapsed/30)>this.lastEncourage&&(this.lastEncourage=Math.floor(e.elapsed/30),r(`${this.lastEncourage*30} seconds. Keep your own pace.`,"time"))}return this.previous={...e},n}},oo=class{constructor(e,t=()=>{}){this.caption=e,this.onMode=t,this.enabled=!0,this.queue=[],this.current=null,this.epoch=0,this.robot=new ro(t),this.available=!!(globalThis.AudioContext||globalThis.webkitAudioContext)}unlock(){return this.robot.unlock()}setEnabled(e){this.enabled=e,e||this.cancel()}cancel(){this.epoch++,clearTimeout(this.current?.timer),this.robot.stop(),globalThis.speechSynthesis?.cancel(),this.current?.resolve(),this.current=null,this.queue.splice(0).forEach(e=>e.resolve()),Th("idle")}say(e,{key:t="guide",interrupt:n=!1}={}){return typeof window<"u"&&window.coachPersonalCue&&(e=window.coachPersonalCue(e,t),e==null)||t==="encouragement"&&this.current&&this.current.key!=="count"||((n||t==="count"&&this.current?.key==="guide"||t!=="encouragement"&&this.current?.key==="encouragement")&&this.cancel(),this.caption(e),!this.enabled||!this.available)?Promise.resolve():new Promise(s=>{let r=this.queue.findIndex(a=>a.key===t);r>=0&&this.queue.splice(r,1)[0].resolve(),this.queue.push({text:e,key:t,resolve:s}),this.pump()})}pump(){if(this.current||!this.queue.length)return;let e=this.queue.shift(),t=this.epoch;this.current=e,this.caption(e.text),Th("speaking");let n=!1,s=()=>{clearTimeout(e.timer),!(n||t!==this.epoch)&&(n=!0,this.current=null,e.resolve(),Th("idle"),this.pump())},r=()=>{t===this.epoch&&(this.onMode("Voice unavailable \xB7 captions on"),s())};e.timer=setTimeout(()=>{t===this.epoch&&(this.robot.stop(),globalThis.speechSynthesis?.cancel(),s())},Math.max(1e4,5e3+e.text.length*220)),this.robot.unlock()?this.robot.play(e.text).then(a=>{t===this.epoch&&(a?s():r())},r):r()}};var fi="mominc-avatar-v1";function Cs(i,e){try{let t=i.getItem(fi);if(t)return{look:e.normalize(JSON.parse(t)),linked:!0}}catch{}return{look:structuredClone(e.defaultLook),linked:!1}}function Af(i,e){if(typeof i!="string"||new TextEncoder().encode(i).length>3e4)throw Error("Choose a Gala look file smaller than 30 KB.");return e.normalize(JSON.parse(i))}var Is={shield:{name:"Shield",line:"The shield holds."},ember:{name:"Ember",line:"The ember field holds."},arc:{name:"Arc",line:"The arc field holds."},frost:{name:"Frost",line:"The frost field holds."}};function Tf(i){try{let e=i.getItem("myr5-pod-power-v1");if(Is[e])return e}catch{}return"shield"}var Bx=[["rapier","cut",186,8,["Crescent cut","Twin crescent","Sky sever","Rift ballet","Horizon split"]],["greatsword","cleave",215,12,["Heavy arc","Fault line","Meteor cleave","World breaker","Heaven fall"]],["dagger","blink",284,6,["Phase step","Double take","Ghost rush","Afterimage storm","Zero moment"]],["sabre","arc",191,7,["Arc shot","Ricochet","Chain flash","Lightning fan","Thunder crown"]],["axe","burst",153,9,["Pulse burst","Split volley","Crossfire","Aurora barrage","Infinite salvo"]],["hammer","rail",210,14,["Rail shot","Twin rail","Ion tunnel","Orbital piercer","Skyline erase"]],["mace","chain",271,10,["Coil lash","Forked current","Tesla web","Storm cage","Living lightning"]],["flail","drone",164,10,["Drone dive","Twin dive","Hunter spiral","Satellite rush","Constellation fall"]],["spear","lance",182,9,["Lance thrust","Triple pierce","Comet lance","Starfall spear","Event horizon"]],["trident","fork",233,11,["Tri-beam","Prism fork","Ninefold light","Sky lattice","Prism cathedral"]],["halberd","rockets",22,14,["Rocket salvo","Cluster bloom","Meteor rain","Orbital garden","Supernova parade"]],["scythe","reap",292,12,["Gravity sweep","Twin moon","Orbit harvest","Rift scythe","Eclipse reaper"]],["bow","arrow",168,10,["Photon arrow","Split star","Comet rain","Heaven string","Constellation arrow"]],["crossbow","gauss",216,11,["Gauss bolt","Capacitor burst","Prism bolt","Warp volley","Luminous spearhead"]],["chakram","return",308,8,["Orbit throw","Twin orbit","Solar wheel","Rift carousel","Galaxy return"]],["gauntlets","rush",25,7,["Power rush","Twin impact","Meteor fists","Dragon engine","Thousand suns"]],["staff","gravity",259,14,["Gravity well","Twin wells","Orbit crush","Singularity","Pocket universe"]],["wand","sonic",179,9,["Sonic ring","Triple echo","Resonance wall","Aurora wave","Universe echo"]],["tome","swarm",147,12,["Nanite rush","Split hive","Prism swarm","Astral flock","Living constellation"]],["cannon","plasma",320,16,["Plasma bloom","Twin reactor","Solar lance","Supernova","Impossible sun"]]],co=Object.freeze([4,8,12,16,20]),Rh=Object.freeze(Object.fromEntries(Bx.map(([i,e,t,n,s])=>[i,Object.freeze({id:i,motion:e,hue:t,cooldown:n,moves:Object.freeze(s)})]))),Rf=4e4;function Ch(i){if(!i||!Object.hasOwn(Rh,i.type)||!Number.isInteger(i.tier)||i.tier<0||i.tier>20)throw new Error("Unknown weapon or tier.");return{type:i.type,tier:i.tier}}function Fi(i){let e=Ch(i),t=Rh[e.type],n=e.tier,s=Math.floor(n/4),r=n/20,a=(t.hue+n*4.7)%360;return{...e,family:t,stage:s,fraction:r,energy:`hsl(${a.toFixed(1)} 96% ${62+r*17}%)`,accent:`hsl(${(a+55)%360} 100% ${70+r*12}%)`,shell:`hsl(${(t.hue+n*2)%360} ${18+r*24}% ${35+r*42}%)`,core:"#f4fbff",width:1+n*.023,length:1+n*.031,reach:35+n*2.8,trailCount:1+Math.floor(n/3),particleCount:3+n*2,orbitCount:s,finLength:2+n*.65,idleLift:1.5+n*.12,attackMs:Math.max(350,680-n*11),ability:$n(e)}}function $n(i){let e=Ch(i),t=Rh[e.type];if(e.tier<co[0])return null;let n=co.filter(s=>e.tier>=s).length;return Object.freeze({id:`${e.type}:${n}`,family:e.type,name:t.moves[n-1],rank:n,unlockTier:co[n-1],cooldownMs:(t.cooldown+(n-1)*2)*1e3,animationMs:1e3+n*180,damageMultiplier:2+n,motion:t.motion})}var lo=class i{constructor(e=null,t=Date.now()){if(!Number.isFinite(t)||t<0)throw new Error("Invalid cooldown clock.");if(typeof e=="string")try{e=JSON.parse(e)}catch{e=null}this.lastNow=t,this.readyAt=t,this.durationMs=0,e?.version===1&&Number.isFinite(e.readyAt)&&(this.readyAt=Math.max(t,Math.min(t+Rf,e.readyAt)),this.durationMs=Math.max(this.readyAt-t,Math.min(Rf,Number(e.durationMs)||0)))}clock(e){if(!Number.isFinite(e)||e<0)throw new Error("Invalid cooldown clock.");return this.lastNow=Math.max(this.lastNow,e),this.lastNow}remaining(e=Date.now()){return Math.max(0,this.readyAt-this.clock(e))}activate(e,{now:t=Date.now(),progress:n,inRest:s=!1,catalog:r=globalThis.GalaWeapons}={}){let a=Ch(e),o=$n(a),c=this.clock(t);if(!s)return{ok:!1,reason:"not-rest"};if(!o)return{ok:!1,reason:"tier",unlockTier:co[0]};if(!n||!r?.unlocked(a,n))return{ok:!1,reason:"locked"};let l=this.remaining(c);return l>0?{ok:!1,reason:"cooldown",remainingMs:l}:(this.readyAt=c+o.cooldownMs,this.durationMs=o.cooldownMs,{ok:!0,ability:o,readyAt:this.readyAt})}snapshot(){return{version:1,readyAt:this.readyAt,durationMs:this.durationMs}}merge(e,t=Date.now()){let n=new i(e,this.clock(t));return n.readyAt>this.readyAt&&(this.readyAt=n.readyAt,this.durationMs=n.durationMs),this.remaining(t)}};var Ht=Math.PI*2,Ih=i=>Math.max(0,Math.min(1,i)),zx=(i,e)=>[Math.round(i),Math.round(e)];function pi(i,e,t,n=1){i.save(),i.globalAlpha*=n,i.fillStyle=t,i.beginPath(),e.forEach(([s,r],a)=>a?i.lineTo(Math.round(s),Math.round(r)):i.moveTo(Math.round(s),Math.round(r))),i.closePath(),i.fill(),i.restore()}function Cf(i,e,t,n=2,s=1){i.save(),i.globalAlpha*=s,i.strokeStyle=t,i.lineWidth=n,i.lineJoin="miter",i.beginPath(),e.forEach(([r,a],o)=>o?i.lineTo(Math.round(r),Math.round(a)):i.moveTo(Math.round(r),Math.round(a))),i.stroke(),i.restore()}function Bi(i,e,t,n,s,r,a,o=2,c=1){let l=Math.max(5,Math.ceil(Math.abs(r-s)*5));Cf(i,Array.from({length:l+1},(h,u)=>zx(e+Math.cos(s+(r-s)*u/l)*n,t+Math.sin(s+(r-s)*u/l)*n)),a,o,c)}function Kt(i,e,t,n,s,r=1){pi(i,[[e,t-n],[e+n,t],[e,t+n],[e-n,t]],s,r)}function ho(i,e,{weapons:t=globalThis.GalaWeapons,x:n=90,y:s=90,scale:r=1,now:a=0,action:o=null,reducedMotion:c=!1}={}){let l=Fi(e),h=o?.special&&l.ability?l.ability.animationMs:l.attackMs,u=o?(a-o.startedAt)/h:-1,d=u>=0&&u<1,f=Ih(u),g=d&&o.special&&!!l.ability,y=d?Math.sin(f*Math.PI):0,p=d?Math.sin(Ih(f/.23)*Math.PI/2):0,m=(g?1.5+l.stage*.11:1)*y,_=l.family.motion,x=c?0:a/1e3,b=c?0:Math.sin(x*1.7)*l.idleLift,C=l.reach*(g?1.25:1),A=g?l.stage+2:1,E=["rail","lance","fork","rockets","arrow","gauss","burst"].includes(_),N=["arc","plasma","sonic"].includes(_),j=0,v=b,M=E?Math.PI/2:N?0:-.14;d&&!c&&(_==="cut"||_==="reap"?M+=-1.15+f*2.9:_==="cleave"?(M+=-1.25+f*2.7,v-=p*12*(1-f)):_==="blink"?(j=Math.sin(f*Math.PI)*C,M+=Math.sin(f*Ht)*.65):_==="return"?(j=Math.sin(f*Math.PI)*C,v-=Math.sin(f*Ht)*14,M+=f*Ht*(2+l.stage)):_==="rush"?(j=Math.sin(f*Math.PI)*16,M=Math.sin(f*Ht*A)*.45):E||N?(j-=m*7,M-=y*.09):(v-=m*12,M+=Math.sin(f*Ht)*.2)),i.save(),i.translate(Math.round(n),Math.round(s)),i.scale(r,r),i.imageSmoothingEnabled=!1;for(let L=0;L<l.orbitCount;L++){let U=x*.7+L*Ht/l.orbitCount;Kt(i,Math.cos(U)*(24+l.tier),Math.sin(U)*(23+l.tier*.4),2+l.stage*.35,l.energy,.5)}if(l.tier>=12&&Bi(i,0,0,24+l.tier,-.7+x*.12,2.9+x*.12,l.accent,1,.22),d&&!c){if(f<.26)for(let L=0;L<l.trailCount;L++){let U=L*Ht/l.trailCount+x,I=(1-f/.26)*(C*.6)+8;Kt(i,Math.cos(U)*I,Math.sin(U)*I,2,l.accent,.65)}for(let L=l.trailCount;L>0;L--)(_==="blink"||_==="rush"||_==="return")&&(i.save(),i.globalAlpha=.06+.08*(1-L/(l.trailCount+1)),i.translate(j-L*(g?9:5),v),i.rotate(M),t.draw(i,e,{x:-20,y:-40,palette:l}),i.restore())}if(i.save(),i.translate(Math.round(j),Math.round(v)),i.rotate(M),i.scale(l.width*.8,l.length*.8),t.draw(i,e,{x:-20,y:-40,palette:l}),l.tier>0){let L=l.finLength,U=1+l.stage;if(["cut","cleave","blink","lance","fork","reap"].includes(_))for(let I of[-1,1])pi(i,[[I*5,-8],[I*(7+L*.32),-24-L],[I*3,-29-L],[I*3,-8]],l.accent,.65);else if(E||N)for(let I=0;I<U;I++){let R=N?-15:-25-I*3;pi(i,[[-13,R],[-13-L*.45,R-4],[-13-L*.45,R+6],[-11,R+4]],l.energy,.75)}else if(_==="return")for(let I=0;I<3+l.stage;I++){let R=I*Ht/(3+l.stage);pi(i,[[Math.cos(R)*15,Math.sin(R)*18-8],[Math.cos(R+.16)*(20+L*.3),Math.sin(R+.16)*(23+L*.3)-8],[Math.cos(R+.3)*15,Math.sin(R+.3)*18-8]],l.accent)}else if(_==="rush")for(let I of[-1,1])pi(i,[[I*9,-18],[I*(9+L*.5),-25-L*.3],[I*14,-11]],l.accent);else for(let I=0;I<U;I++){let R=I*Ht/U-Math.PI/2;Kt(i,Math.cos(R)*(22+L*.2),Math.sin(R)*(28+L*.2)-4,1.5+l.stage*.3,l.accent)}}if(i.restore(),d&&c)Kt(i,32,-16,g?11:6,l.energy,.75),Bi(i,32,-16,g?16:10,0,Ht,l.accent,2,.65);else if(d&&f>.18){let L=Ih((f-.18)/.62),U=Math.min(1,(1-f)*3.5),I=32+L*C,R=Math.sin(L*Math.PI),P=(k,Y=2,se=1,Se=l.energy)=>Cf(i,k,Se,Y,U*se),$=(k,Y,se,Se=2,Ve=1)=>Bi(i,k,Y,se,0,Ht,l.energy,Se,U*Ve),V=(k,Y=!1)=>{let se=C*(.58+R*.35);for(let Se=0;Se<l.trailCount;Se++)Bi(i,8,k,se-Se*3,(Y?-.1:-1.4)+L*.45,(Y?1.5:.5)+L*.55,Se===0?l.core:l.energy,Se===0?2:3,U/(1+Se*.35))};switch(_){case"cut":V(-6),g&&V(14,!0);break;case"cleave":if(V(6),P([[24,-45],[I,32],[I+C*.35,32]],4+m*5),g)for(let k=0;k<A;k++)P([[I,32],[I+(k-A/2)*9,16-k*3],[I+(k-A/2)*14,28]],2);break;case"blink":for(let k=0;k<A;k++)P([[I-k*9-9,-16+k*5],[I-k*9+10,6+k*5]],2+k%2);break;case"arc":for(let k=0;k<A;k++)P([[16,-10],[I*.4,-18+k*7],[I*.6,-4+k*4],[I,-14+k*8]],2);break;case"burst":for(let k=0;k<2+A;k++){let Y=24+(L+k*.17)%1*C;P([[Y-10,-12+k*5],[Y+5,-12+k*5]],2+g)}break;case"rail":P([[5,-6],[32+C,-6]],3+m*5),P([[5,-6],[32+C,-6]],2,1,l.core);for(let k=0;k<A;k++)$(25+k*C/A,-6,5+R*(6+l.stage),1,.7);break;case"chain":for(let k=0;k<A+1;k++){let Y=(k-A/2)*12;P([[0,-20],[25,-8],[48,Y-10],[65,Y+2],[I,Y-5]],2),Kt(i,I,Y-5,3,l.core,U)}break;case"drone":for(let k=0;k<A;k++){let Y=Math.sin(L*Ht+k)*(14+l.stage*3);P([[I-20,Y-8],[I-9,Y],[I,Y]],1,.7),Kt(i,I,Y,4+l.stage*.5,l.energy,U)}break;case"lance":pi(i,[[12,-8],[I+30,-13-m*2],[I+43,-5],[I+30,3+m*2],[12,-2]],l.energy,U*.8),P([[16,-5],[I+36,-5]],2,1,l.core);break;case"fork":for(let k=-1;k<=1;k++){let Y=k*(12+L*16);P([[0,k*7],[I,Y]],2+m*2),Kt(i,I,Y,3+l.stage,l.accent,U),g&&$(I,Y,7+R*10,1)}break;case"rockets":for(let k=0;k<2+A;k++){let Y=-Math.sin(L*Math.PI)*(18+k*6)+k*5;P([[I-13,Y+7],[I-6,Y+1],[I,Y]],2,.7),Kt(i,I,Y,3,l.accent,U),L>.8&&$(I,Y,4+R*12,2)}break;case"reap":V(-2),$(I*.6,-6,10+R*15,3,.7),g&&V(15,!0);break;case"arrow":for(let k=0;k<A;k++){let Y=(k-(A-1)/2)*9;P([[I-26,Y],[I+7,Y]],2),pi(i,[[I+14,Y],[I+2,Y-5],[I+2,Y+5]],l.core,U)}break;case"gauss":for(let k=0;k<A;k++){let Y=I-k*11;Kt(i,Y,-6,7+l.stage,l.energy,U),P([[Y-23,-6],[Y,-6]],2,.8,l.accent)}break;case"return":for(let k=0;k<A;k++)Bi(i,j,v,18+k*5,L*Ht+k,L*Ht+k+4,l.energy,2,U*.8);break;case"rush":for(let k=0;k<3+A;k++){let Y=20+(L+k*.13)%1*C*.8,se=Math.sin(k*2.1)*14;P([[Y-19,se],[Y+2,se]],3),Kt(i,Y+5,se,4+l.stage,l.accent,U)}break;case"gravity":pi(i,Array.from({length:12},(k,Y)=>{let se=Y*Ht/12;return[I*.7+Math.cos(se)*(8+R*18),-6+Math.sin(se)*(8+R*18)]}),"#080a1b",U);for(let k=0;k<A+1;k++)Bi(i,I*.7,-6,12+R*19+k*4,k+x,-k+x+4,l.energy,2,U*.8);break;case"sonic":for(let k=0;k<A+1;k++)Bi(i,8+k*15+L*C*.7,-5,8+L*(18+l.tier)-k*2,-1.15,1.15,l.energy,2+g,U*.8);break;case"swarm":for(let k=0;k<4+A*2;k++){let Y=k*2.399+x*3,se=I*.8+Math.cos(Y)*(8+R*16),Se=Math.sin(Y)*(12+R*14);P([[se-7,Se+5],[se,Se]],1,.6),Kt(i,se,Se,2+k%2,l.energy,U)}break;case"plasma":if(P([[10,-6],[I,-6]],6+m*8,.7),Kt(i,I,-6,9+m*(7+l.stage),l.energy,U),Kt(i,I,-6,4+m*4,l.core,U),g)for(let k=0;k<A;k++)$(I,-6,12+k*5+R*10,1,.55);break}if(g&&L>.5)for(let k=0;k<l.particleCount;k++){let Y=k*2.399,se=(L-.5)*(20+k%7*8+l.tier);Kt(i,32+C*.7+Math.cos(Y)*se,Math.sin(Y)*se*.65,1+k%2,k%3?l.energy:l.accent,U*.7)}}return i.restore(),{active:d,progress:f,profile:l}}var Hx=new Set(["rapier","greatsword","dagger","spear","trident","scythe","gauntlets"]);function If(i={}){return{activeDays:Math.max(0,Number(i.activeDays)||0),totalXp:Math.max(0,Number(i.activeDays)||0)*100,strength:1+Math.floor(Math.max(0,Number(i.completedSets)||0)/4),...i.trainingVersion===1?{trainingVersion:1,training:i.training}:{}}}function Pf(){let i=window.GalaAvatar,e=window.GalaWeapons,t=document.getElementById("restAvatar"),n=document.querySelector(".encounter"),s=document.getElementById("restWeaponFx"),r=document.getElementById("weaponType"),a=document.getElementById("weaponTier"),o=document.getElementById("weaponStatus"),c=document.createElement("canvas"),l=matchMedia("(prefers-reduced-motion: reduce)"),h=If(),u=null,d={type:"rapier",tier:0},f=!1,g=0,y=0,p=null,m=!1,_={x:0,y:0,scale:1},x="";t.width=160,t.height=168,window.GalaProgress={read:()=>h};for(let R of e.types){let P=document.createElement("option");P.value=R.id,P.textContent=R.name+" \xB7 "+e.requirements({type:R.id,tier:0}).label,r.append(P)}function b(){let R=n.getBoundingClientRect(),P=t.getBoundingClientRect();if(!R.width||!R.height)return;let $=Math.min(1,Math.max(320,Math.round(R.width/2))/R.width);s.width=Math.round(R.width*$),s.height=Math.round(R.height*$),_={x:(P.left+P.width*.78-R.left)*$,y:(P.top+P.height*.48-R.top)*$,scale:$*1.15}}function C(){try{u=Cs(localStorage,i).look}catch{u=structuredClone(i.defaultLook)}let R=u.weapon||{type:"rapier",tier:0};d=e.unlocked(R,h)?R:{type:R.type,tier:0};let P=d.type+":"+d.tier;x!==P&&(p=null,m=!1,x=P),i.draw(c,u,{base:!1,weapon:!1,prop:!1}),r.value=R.type,a.replaceChildren();for(let Y=0;Y<e.tiers.length;Y++){let se={type:R.type,tier:Y},Se=document.createElement("option"),Ve=e.requirements(se);Se.value=Y,Se.disabled=!e.unlocked(se,h),Se.textContent=e.tiers[Y]+(Se.disabled?` \xB7 ${Ve.xp} ${Ve.label} XP`:""),a.append(Se)}a.value=d.tier;let $=$n(d),V=e.requirements(d),k=e.trainingProgress(d,h);o.textContent=`${V.label} \xB7 ${k.totalXp} XP \xB7 `+($?`${$.name} \xB7 ${$.cooldownMs/1e3}s`:"Special at tier 4"),R.tier!==d.tier&&(o.textContent+=" Upgrade not yet earned."),document.getElementById("restWeaponName").textContent=e.types.find(Y=>Y.id===d.type).name,n.dataset.weapon=Hx.has(d.type)?"melee":"ranged",n.classList.add("weapon-evolution"),n.style.setProperty("--weapon-energy",Fi(d).energy),b(),N(performance.now())}function A(){try{let R={type:r.value,tier:Number(a.value)};if(!e.unlocked(R,h))return;localStorage.setItem(fi,JSON.stringify({...u,weapon:R})),window.dispatchEvent(new Event("mominc-avatar-change"))}catch{o.textContent="Could not save this weapon."}}r.addEventListener("change",()=>{e.unlocked({type:r.value,tier:Number(a.value)},h)||(a.value="0"),A()}),a.addEventListener("change",A);function E(){return p?.special?$n(d)?.animationMs||1100:Fi(d).attackMs}function N(R){p&&R-p.startedAt>=E()&&(p=m?{startedAt:R,special:!1}:null,m=!1);let P=t.getContext("2d");P.clearRect(0,0,160,168),P.imageSmoothingEnabled=!1;let $=p&&!l.matches?Math.sin(Math.min(1,(R-p.startedAt)/E())*Math.PI):0;P.drawImage(c,26+$*4,14-$*5,96,144);let V=s.getContext("2d");V.clearRect(0,0,s.width,s.height),V.save(),V.translate(_.x,_.y),V.rotate(-Math.PI/2-.13),ho(V,d,{weapons:e,x:0,y:0,scale:_.scale,now:R,action:p,reducedMotion:l.matches}),V.restore()}function j(R){g=0,!(!f||document.hidden)&&(R-y>(l.matches?100:32)&&(N(R),y=R),g=requestAnimationFrame(j))}function v(){f=!0,C(),g||(g=requestAnimationFrame(j))}function M(){f=!1,p=null,m=!1,g&&cancelAnimationFrame(g),g=0,n.classList.remove("team-strike")}let L=()=>{document.hidden?(g&&cancelAnimationFrame(g),g=0):f&&!g&&(b(),g=requestAnimationFrame(j))},U=R=>{h=If(R.detail),C()},I=new ResizeObserver(b);return I.observe(n),window.addEventListener("myr5:account-progress",U),window.addEventListener("mominc-avatar-change",C),document.addEventListener("visibilitychange",L),C(),{load:C,start:v,stop:M,get weapon(){return{...d}},get progress(){return{...h}},attack(R){let P=performance.now();if(!R.special&&p&&P-p.startedAt<E()&&(p.special||P-p.startedAt<E()*.6)){m=!0;return}p={startedAt:P,special:!!R.special},m=!1,n.classList.toggle("team-strike",!!R.assisted),N(P)},dispose(){M(),I.disconnect(),window.removeEventListener("myr5:account-progress",U),window.removeEventListener("mominc-avatar-change",C),document.removeEventListener("visibilitychange",L),r.removeEventListener("change",A),a.removeEventListener("change",A)}}}var Vx=i=>Math.floor(i/864e5);function uo(i,e,t=Date.now()){let n=i?.day===Vx(t)&&Number.isSafeInteger(i.loginStreak)&&i.loginStreak>=1,s=Number.isInteger(e?.tier)&&e.tier>=0&&e.tier<=20?e.tier+1:1;return 10*(n?i.loginStreak:1)*s*(n&&i.breathingCompleted===!0?100:1)}Kn();var Lf=25,Gx=100,Ph=1e9,Wx=3e3,Ps={...Object.fromEntries(Object.values(Rt).map(i=>[i.id,i.defaultGoal])),squat:3,pushup:3,tree:9,warrior:9,horse:9,boxing:9,jogging:3,jumping:3},zi=i=>i.kind==="hold"?i.totalHold:i.kind==="pace"?i.active??0:i.count;function Xx(i){try{let e=typeof i=="string"?JSON.parse(i):i;if(e?.version===1&&Number.isSafeInteger(e.completedSets)&&e.completedSets>=0)return{version:1,completedSets:Math.min(e.completedSets,1e6)}}catch{}return{version:1,completedSets:0}}var fo=class{constructor(e=null,{cooldown:t=null,now:n=Date.now()}={}){this.progress=Xx(e),this.phase="pod",this.sequence=0,this.active=null,this.preview=!1,this.restUntil=0,this.hits=0,this.damage=0,this.lastTap=-1/0,this.lastRestInteraction=-1/0,this.abilities=new lo(t,n)}get xp(){return this.progress.completedSets*Lf}get level(){return 1+Math.floor(this.xp/Gx)}get coachHealth(){return Math.max(0,Ph-this.damage)}touchRest(e=Date.now()){this.phase==="rest"&&(this.lastRestInteraction=Math.max(this.lastRestInteraction,e))}shouldEndRest(e=Date.now()){return this.phase==="rest"&&e>=Math.max(this.restUntil,this.lastRestInteraction)+Wx}get attackDamage(){return uo(this.combat,this.weapon)}start(e,t=Ps[e],n=60){if(!Object.hasOwn(Ps,e))throw new Error("Unknown exercise");return this.active={id:++this.sequence,mode:e,goal:Math.max(1,Number(t)||Ps[e]),restSeconds:Math.max(15,Math.min(180,Number(n)||60))},this.phase="set",this.preview=!1,this.active}consume(e,t){if(this.phase!=="set"||!this.active||e.mode!==this.active.mode||!(zi(e)>=this.active.goal))return null;let s=e.kind!=="pace"||e.active>0;return s&&this.progress.completedSets++,this.phase="rest",this.preview=!1,this.restUntil=t+this.active.restSeconds*1e3,this.hits=0,this.damage=0,this.lastTap=-1/0,this.lastRestInteraction=-1/0,{mode:e.mode,name:e.name,value:zi(e),goal:this.active.goal,earned:s,xp:s?Lf:0,level:this.level,set:this.progress.completedSets}}previewRest(e,t=60){this.phase="rest",this.preview=!0,this.restUntil=e+t*1e3,this.hits=0,this.damage=0,this.lastTap=-1/0,this.lastRestInteraction=-1/0}remaining(e){return Math.max(0,Math.ceil((this.restUntil-e)/1e3))}extend(e=30,t=Date.now()){this.phase==="rest"&&(this.restUntil=Math.max(this.restUntil,t)+e*1e3)}tap(e,t=!1){if(this.touchRest(e),this.phase!=="rest"||e-this.lastTap<180)return null;this.lastTap=e,this.hits++;let n=t&&this.hits%3===0,s=uo(this.combat,this.weapon,e);return this.damage+=s,{hits:this.hits,damage:s,totalDamage:this.damage,blocked:s===0,assisted:n,charge:t?this.hits%3:0}}special(e,{now:t=Date.now(),progress:n,catalog:s}={}){this.touchRest(t);let r=this.abilities.activate(e,{now:t,progress:n,catalog:s,inRest:this.phase==="rest"});if(!r.ok)return r;let a=uo(this.combat,e,t);return this.damage+=a,{...r,special:!0,assisted:!1,damage:a,totalDamage:this.damage,blocked:a===0,hits:this.hits}}leave(){this.phase="pod",this.active=null}};var Nf={reps:["Steady work.","One movement at a time.","Keep your own pace."],hold:["Stay comfortable.","Take your time.","Steady work."],pace:["Find your rhythm.","Keep your own pace.","Steady work."],steps:["Find your rhythm.","One step at a time.","Keep your own pace."],jumps:["Keep your own pace.","One movement at a time.","Steady work."]},po=class{constructor(){this.reset()}reset(){this.first=null,this.last=-1/0,this.halfway=!1,this.index=0}update(e,t,n,s=[]){if(!e.tracking||e.complete||zi(e)>=t||["squat","pushup","jumping"].includes(e.mode)&&!e.calibrated||e.kind==="hold"&&e.progress!==1||(this.first??=n,s.some(r=>r.key!=="count")||n-this.last<8e3))return null;if(!this.halfway&&zi(e)>=t/2)return this.halfway=!0,this.last=n,{text:"Halfway. Keep your own pace.",key:"encouragement"};if(n-this.first>=18e3&&n-this.last>=2e4){this.last=n;let r=Nf[e.kind]||Nf.reps;return{text:r[this.index++%r.length],key:"encouragement"}}return null}};var Df=new WeakMap,Nh=i=>Number.isFinite(Number(i))?Math.max(0,Math.floor(Number(i))):0,Uf=i=>String(Nh(i)).padStart(2,"0"),_r=i=>`${String(Math.floor(Nh(i)/60)).padStart(2,"0")}:${String(Nh(i)%60).padStart(2,"0")}`;function qx(i){let e=document.createElement("span");if(e.className=i===":"?"flip-colon":"flip-tile",i===":")return e.textContent=i,e;for(let t of["top","bottom","falling","landing"]){let n=document.createElement("span"),s=document.createElement("span");n.className=`flip-half flip-${t}`,s.textContent=i,n.append(s),e.append(n)}return e.value=i,e}function Lh(i){clearTimeout(i.timer),i.classList.remove("is-flipping");for(let e of i.children)e.firstChild.textContent=i.value}function Yx(i,e,t){if(i.value===e)return;Lh(i);let n=i.value;if(i.value=e,!t){Lh(i);return}let[s,r,a,o]=i.children;s.firstChild.textContent=o.firstChild.textContent=e,r.firstChild.textContent=a.firstChild.textContent=n,i.offsetWidth,i.classList.add("is-flipping"),i.timer=setTimeout(()=>Lh(i),420)}function mo(i,e,t=""){let n=String(e),s=n.includes(":")?"clock":"count",r=Df.get(i);if(r?.text===n&&r.label===t)return;i.classList.add("flip-display"),i.setAttribute("role","img"),i.setAttribute("aria-label",`${n} ${t}`.trim());let a=!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches&&!document.hidden;if(!r||r.format!==s||r.text.length!==n.length){let o=r?.format===s&&s==="count"&&r.text.length<=n.length?r.text.padStart(n.length,"0"):n;for(let l of r?.cells||[])clearTimeout(l.timer);let c=[...o].map(qx);for(let l of c)l.setAttribute("aria-hidden","true");i.replaceChildren(...c),r={cells:c,format:s}}[...n].forEach((o,c)=>{o!==":"&&Yx(r.cells[c],o,a)}),r.text=n,r.label=t,Df.set(i,r)}Kn();var Ls=i=>Rt[i]?.group||(i==="jumping"?"cardio":null);var mi=Object.freeze({advance:"That wasn't enough to impress my clipboard. Ready for the next level?",max:"Maximum difficulty? Fine. One more than your last round. Now we're negotiating.",limit:"Five rounds. Even I have to respect the paperwork. This exercise family is done for today.",rest:"Rest first. The next challenge can wait."}),vr=new Map;function kf(i,e){let t=vr.get(e);t||(t=new Intl.DateTimeFormat("en-CA",{timeZone:e,year:"numeric",month:"2-digit",day:"2-digit"}),vr.size>=32&&vr.delete(vr.keys().next().value),vr.set(e,t));let n=Object.fromEntries(t.formatToParts(new Date(i)).map(s=>[s.type,s.value]));return`${n.year}-${n.month}-${n.day}`}function Of(i,e){let t=i?.groups?.[Ls(e)];if(!t)return null;if(t.remaining)return{...t.next,line:t.mastered?mi.max:mi.advance,level:t.level,maxLevel:t.maxLevel,round:t.today+1};let n=wt.findIndex(o=>o.id===t.id),r=[...wt.slice(n+1),...wt.slice(0,n)].map(o=>i.groups[o.id]).filter(o=>o.remaining>0),a=r.find(o=>!o.mastered)||r[0];return a?{...a.next,line:mi.limit,level:a.level,maxLevel:a.maxLevel,round:a.today+1,changedFamily:!0}:null}function Ff({mode:i,busy:e,pending:t,onNext:n}){let s=document.createElement("section");s.className="workout-route",s.setAttribute("aria-label","Your exercise route"),s.innerHTML='<p data-next role="status">Loading\u2026</p><button type="button" data-follow>Next level \u203A</button>',document.querySelector(".difficulty-control .slider-scale").after(s);let r=document.createElement("details");r.className="workout-route",r.innerHTML="<summary>Easy-to-hard route</summary><ol data-path></ol>",document.querySelector("#movementCards").before(r);let a=document.createElement("section");a.className="workout-route rest-challenge",a.hidden=!0,a.setAttribute("aria-label","Next round challenge"),a.innerHTML="<p data-line></p><strong data-next></strong><p data-rounds></p>",document.querySelector(".rest-receipt").after(a);function o(){let u=window.coachProgress?.exerciseRoute;return u&&u.day===kf(Date.now(),u.timezone)?u:null}function c(){return t()?null:Of(o(),i())}function l(){let u=o(),d=u?.groups?.[Ls(i())],f=c(),g=t(),y=d?`${d.name} \xB7 round ${d.today} of ${u.limit}${d.mastered?" \xB7 top level":""}${f?.changedFamily?" \xB7 next: "+u.groups[f.group].name:""}`:"";s.querySelector("[data-next]").textContent=g?"Saving\u2026":f?`${f.name} \xB7 ${f.goal} ${f.unit}${y?" \xB7 "+y:""}`:d?`Done for today.${y?" \xB7 "+y:""}`:"Loading\u2026";let p=s.querySelector("[data-follow]");p.disabled=e()||!f,p.textContent=f?.changedFamily?"Next focus \u203A":d?.mastered?"One more \u203A":"Next level \u203A",r.querySelector("[data-path]").replaceChildren(...(d?.steps||[]).map(m=>{let _=document.createElement("li");return _.textContent=`${m.complete?"\u2713 ":""}${m.level}. ${m.name}`,m.mode===f?.mode&&_.setAttribute("aria-current","step"),_})),a.hidden||(a.querySelector("[data-line]").textContent=g?"Reconnect to save this round.":f?.line||mi.limit,a.querySelector("[data-next]").textContent=f?`${f.name} \xB7 ${f.goal} ${f.unit}`:"Finished for today",a.querySelector("[data-rounds]").textContent=f?`Round ${f.round} of ${u.limit} \xB7 Level ${f.level} of ${f.maxLevel}`:"")}s.querySelector("[data-follow]").onclick=()=>{let u=c();u&&!e()&&n(u)},window.addEventListener("myr5:account-progress",l),window.addEventListener("myr5:account-cleared",l),window.addEventListener("myr5:movement-configured",l),document.addEventListener("visibilitychange",()=>{document.hidden||l()});let h=setInterval(()=>{!document.hidden&&window.coachProgress?.exerciseRoute&&!o()&&window.coachAccount?.refresh()},6e4);return window.addEventListener("pagehide",()=>clearInterval(h)),l(),{render:l,suggestion:c,showResult(){a.hidden=!1,l()},hideResult(){a.hidden=!0},canStart(u){return!t()&&(o()?.groups?.[Ls(u)]?.remaining??1)>0}}}var Bf="myr5-workout-session-owner-v1",go=class{constructor({storage:e=globalThis.localStorage,saveProgress:t}={}){this.storage=e,this.saveProgress=t;let n=this.read();this.phase="idle",this.revision=Math.max(0,Number(n?.revision)||0)+(n?.phase==="active"?1:0),this.lease=null,this.persist()}read(){try{return JSON.parse(this.storage?.getItem(Bf)||"null")}catch{return null}}persist(){try{return this.storage?.setItem(Bf,JSON.stringify({version:1,phase:this.phase,revision:this.revision})),!0}catch{return!1}}snapshot(){return{phase:this.phase,revision:this.revision,transitioning:!!this.lease}}canStart(){return this.phase==="idle"&&!this.lease}start(){return this.canStart()?(this.phase="active",this.revision++,this.persist(),!0):!1}stop(){this.phase!=="idle"&&(this.phase="idle",this.revision++,this.persist())}async complete(e){if(this.phase!=="active")return{saved:!1,reason:"no active workout"};let t=await this.saveProgress?.(e);return t?.local?(this.phase="idle",this.revision++,this.persist()?{saved:!0,...t}:{saved:!1,reason:"workout session acknowledgement was not saved"}):{saved:!1,reason:t?.reason||"workout progress was not saved"}}acquireIdleLease(){if(!this.canStart())return null;let e={revision:this.revision,released:!1};return this.lease=e,e}releaseIdleLease(e){this.lease===e&&(e.released=!0,this.lease=null)}async save(){return this.persist()}};var Dh=null;function jx(i){try{Dh??=fetch(Ah).then(e=>e.json()).catch(()=>(Dh=null,null)),Dh.then(e=>{if(!e)return;let t=["Get into position.",...Array.from({length:Math.min(60,Number(i)||0)},(n,s)=>String(s+1))];for(let n of t){let s=e.phrases[n];s&&fetch(s,{priority:"low"}).catch(()=>{})}})}catch{}}var te=i=>document.getElementById(i),Gf="myr5-workout-progress-v1",yo="myr5-special-cooldown-v1",Kx=i=>`${Math.floor(i/60)}:${String(Math.floor(i%60)).padStart(2,"0")}`,Uh=i=>{try{return localStorage.getItem(i)}catch{return null}};function Wf({voice:i,movements:e,onStop:t,onNext:n}){let s={enter(){},leave(){},hit(){},dispose(){},edit(){}},r=!1,a=Pf();window.addEventListener("myr5:optional-materials-ready",async()=>{if(window.myr5VerifiedOptionalAccess!==!0||r)return;r=!0;let{initHandCompanion:B}=await Promise.resolve().then(()=>(Vf(),Hf));s=B()},{once:!0});let o=new fo(null,{cooldown:Uh(yo)}),c=new po,l=new go({saveProgress:async B=>{if(!E(Gf,JSON.stringify(o.progress)))return{local:!1,reason:"Progress could not be saved on this device."};try{let G=await window.coachAccount?.complete(B);return{local:!0,accountSynced:G?.accountSynced===!0,queued:G?.queued===!0}}catch(G){return{local:!0,accountSynced:!1,queued:!1,reason:G?.message||"Account outbox could not be saved"}}}}),h=null,u=null,d=null,f=0,g=0,y=-1/0,p=!1,m,_=null,x=null,b=Ff({mode:()=>h||"squat",busy:()=>o.phase!=="pod"||document.body.dataset.tracking==="true",pending:()=>!!_,onNext:n});window.addEventListener("myr5:coach-plan",()=>{if(o.phase==="set")return;let B=h||"squat";h=null,L(B),window.coachPlan?.data?.profile?.restSeconds&&(te("restDuration").value=window.coachPlan.data.profile.restSeconds)});let C=window.GalaAvatar,A=!0,E=(B,G)=>{try{return localStorage.setItem(B,G),!0}catch{return A=!1,!1}};function N(){let B=String(o.level).padStart(2,"0");te("levelBadge").textContent="WORKOUT LV. "+B,te("restLevel").textContent="LV. "+B,te("setNumber").textContent="SET "+String(o.progress.completedSets+1).padStart(2,"0")}function j(){if(!C)return;try{m=Cs(localStorage,C)}catch{m={look:structuredClone(C.defaultLook),linked:!1}}for(let G of["miniAvatar","identityAvatar"])C.draw(te(G),m.look,{base:G!=="restAvatar"});let B=window.MBS_DJ?.display()||m.linked&&m.look.name||"Guest";a.load(),te("guestLabel").textContent=m.linked?B:"Gala look",te("restGuest").textContent=B,te("identityName").textContent=B,te("restAvatar").setAttribute("aria-label",B+" on the floating platform"),te("identityStatus").textContent=m.linked?"Saved":"Guest"}function v(){if(u??=document.querySelector(".myr5-companion-card"),!u)return;d!==u&&(M.observe(u,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["data-ready"]}),d=u);let B=o.phase==="rest"?te("restCoachMount"):te("coachMount");u.parentElement!==B&&B.append(u),window.myr5Creature?.stats().stage!==(o.phase==="rest"?"encounter":"pod")&&window.myr5Creature?.stage(o.phase==="rest"?"encounter":"pod");let G=u.querySelector(".myr5-companion-status")?.textContent||"";for(let ce of["coachLoading","restCoachLoading"]){let ge=te(ce);ge.hidden=u.dataset.ready==="true",!ge.hidden&&ge.textContent!==G&&(ge.textContent=G)}}let M=new MutationObserver(v);M.observe(te("view"),{childList:!0,subtree:!0}),v();function L(B){if(B!==h){h=B;let G=e[B].kind,ce=G==="hold"||G==="pace"?"seconds":G==="steps"?"steps":G==="jumps"?"jumps":"reps",ge=window.coachProgress?.exerciseRoute?.groups?.[Ls(B)]?.next,Ue=ge?.mode===B?ge.goal:window.coachPlan?.targets?.goals[B]||Ps[B],Ze=[...new Set([1,2,3,5,9,10,15,20,30,45,60,90,120,180,Ue,Math.max(1,Ue-1),Ue+1])].sort((ze,D)=>ze-D);te("goal").replaceChildren(...Ze.map(ze=>{let D=document.createElement("option");return D.value=ze,D.textContent=ze+" "+ce,D})),te("goal").value=Ue}{let G=e[B].kind,ce=G==="hold"||G==="pace"?"seconds":G==="steps"?"steps":G==="jumps"?"jumps":"reps";te("setSummary").textContent=e[B].name+" \xB7 "+te("goal").value+" "+ce}c.reset(),te("goalValue").textContent=["hold","pace"].includes(e[B].kind)?Kx(Number(te("goal").value)):String(te("goal").value),N(),b.render(),document.body.dataset.tracking!=="true"&&(te("start").disabled=!b.canStart(B))}async function U(B){if(L(B),!l.canStart())throw Error("Workout activation is in progress. Try again.");if(!b.canStart(B))throw Error(_?"Reconnect to save your last round.":"Five rounds today for this focus. Pick another.");if(!window.coachAccount)throw Error("Connecting\u2026 try again.");if(!l.start())throw Error("Workout activation is in progress. Try again.");try{let G=await window.coachAccount.start(B,Number(te("goal").value));o.start(B,Number(te("goal").value),Number(te("restDuration").value)),jx(te("goal").value),o.active.cloudId=G.id,document.body.dataset.screen="pod",clearInterval(f)}catch(G){throw l.stop(),G}}function I(B){if(![...te("goal").options].some(G=>Number(G.value)===B)){let G=document.createElement("option");G.value=B,G.textContent=B+" "+(["hold","pace"].includes(e[h].kind)?"seconds":e[h].kind==="steps"?"steps":"reps"),te("goal").append(G)}te("goal").value=B,te("goal").dispatchEvent(new Event("change",{bubbles:!0}))}function R(B){let G=o.active?.mode===B.mode?o.active.goal:Number(te("goal").value)||Ps[B.mode];te("activity").style.width=Math.min(100,zi(B)/G*100)+"%"}function P(){let B=te("coachPower").value;document.body.dataset.power=B,te("powerName").textContent=Is[B].name.toUpperCase()+" ACTIVE",E("myr5-pod-power-v1",B)}function $(){o.weapon=a.weapon;let B=o.combat,G=te("restFeedback");G.textContent||(G.textContent=B?`${o.attackDamage} dmg / hit \xB7 ${B.loginStreak}-day streak${B.breathingCompleted?" \xB7 \xD7100 breath":""}`:`${o.attackDamage} dmg / hit`)}function V(){$();let B=a.weapon,G=$n(B),ce=o.abilities.remaining(),ge=te("weaponSpecial");ge.disabled=o.phase!=="rest"||!G||ce>0,ge.textContent=G?ce?`${G.name} \xB7 ${Math.ceil(ce/1e3)}s`:G.name:"Special \xB7 tier 4",te("weaponCooldown").value=ce?Math.max(0,1-ce/Math.max(1,o.abilities.durationMs)):1}te("coachPower").value=Tf({getItem:Uh}),P();function k(){let B=o.coachHealth;te("coachHealth").textContent=(B>=1e9?(B/1e9).toFixed(B%1e9?2:0)+"B":B.toLocaleString())+" HP",te("bossHealth").style.width=B/Ph*100+"%",te("bossHealth").parentElement.setAttribute("aria-valuenow",String(B))}function Y(){if(x&&o.phase==="rest"&&!document.hidden&&!document.body.dataset.cinematic){let B=x;x=null,i.say(B,{key:"challenge",interrupt:!0})}}window.addEventListener("myr5:cinematic-end",Y);function se(){if(o.phase!=="rest")return;Y();let B=Date.now();if(o.shouldEndRest(B)){Z();return}V();let G=o.remaining(B),ce=b.suggestion();mo(te("restTime"),_r(G),"recovery remaining"),te("nextSet").disabled=G>0||!ce,te("nextSet").textContent=G?"Recovering\u2026":_?"Saving\u2026":ce?"Next round \u2192":"Finished for today",!G&&!p&&!document.hidden&&(p=!0,i.say("Rest complete. Keep tapping to stay.",{interrupt:!0}))}function Se(B=null){for(let G of["settings","identity"])te(G).open&&te(G).close();document.body.dataset.screen="rest",te("homeScreen").hidden=!0,te("restScreen").hidden=!1,te("restEyebrow").textContent=B?"SET COMPLETE":"PRACTICE",te("restHeading").textContent="Rest",B?b.showResult():b.hideResult(),te("setReceipt").textContent=B?`${B.name} \xB7 ${Math.round(B.value)} ${e[B.mode].kind==="hold"||e[B.mode].kind==="pace"?"seconds":e[B.mode].kind==="steps"?"steps":e[B.mode].kind==="jumps"?"jumps":"reps"}`:"Practice",te("earnedXp").textContent=B?.earned?`+${B.xp} XP`:"NO XP",te("damageTotal").textContent="0 DAMAGE",k(),$(),te("restFeedback").textContent="",s.enter(),a.start(),p=!1,y=-1/0,j(),N(),v(),clearInterval(f),f=setInterval(se,250),se(),te("restHeading").focus(),history.replaceState(null,"","#rest"),window.myr5Creature?.play(B?"celebrate":"rest"),i.say(B?"Set complete. Take a breath.":"Tap to strike.",{interrupt:!0})}async function Ve(B,G){let ce=o.consume(B,G);if(!ce)return!1;let ge=o.active?.cloudId,Ue=await l.complete({id:ge,value:ce.value,active:B.active||0});return Ue.saved?(ce.earned&&ge&&(_={id:ge,result:ce},Ue.accountSynced||(te("setReceipt").textContent="Saved on this device \xB7 Waiting to sync.")),t(),Se(ce),A||(te("setReceipt").textContent+=" \xB7 Progress could not be saved on this device."),!0):(te("setReceipt").textContent=Ue.reason,!1)}function Z(){x=null,s.leave(),a.stop(),clearInterval(f),clearTimeout(g),i.cancel(),o.leave(),document.body.dataset.screen="pod",te("restScreen").hidden=!0,te("homeScreen").hidden=!1,v(),history.replaceState(null,"","#pod"),te("start").disabled=!b.canStart(h),b.render(),te("start").focus()}document.querySelector(".encounter").addEventListener("pointerdown",()=>o.touchRest(Date.now()),{passive:!0}),te("attackCoach").addEventListener("click",()=>{$();let B=Date.now(),G=o.tap(B,!0);if(!G)return;s.hit(G),a.attack(G),window.myr5Creature?.play(G.assisted?"encourage":G.blocked?"agree":"rest"),te("damageTotal").textContent=G.totalDamage+" DAMAGE",k(),te("damageFloat").textContent=G.blocked?G.assisted?"TEAM STRIKE \xB7 BLOCKED":"BLOCKED \xB7 0":(G.assisted?"TEAM \u2212":"\u2212")+G.damage;let ce=document.querySelector(".encounter");ce.classList.remove("hit"),ce.offsetWidth,ce.classList.add("hit"),clearTimeout(g),g=setTimeout(()=>ce.classList.remove("hit"),650),te("restFeedback").textContent=G.blocked?`${Is[te("coachPower").value].line} ${G.hits} ${G.hits===1?"hit":"hits"}, zero damage.`:`${G.assisted?"Team strike! ":""}${G.hits} hits \xB7 ${G.totalDamage} dmg`,B-y>1e4&&(y=B,window.myr5Creature?.play(G.blocked?"agree":"encourage"),i.say(G.blocked?"Nice teamwork. My shield is still intact. Keep training.":"You and that hand make quite a team. That one connected.",{key:"rest"}))}),te("leaveRest").addEventListener("click",Z),te("moreRest").addEventListener("click",()=>{o.extend(30,Date.now()),p=!1,se(),i.say("Thirty more seconds. Take your time.",{interrupt:!0})}),te("weaponSpecial").addEventListener("click",async()=>{let B=()=>{$(),o.abilities.merge(Uh(yo));let ge=o.special(a.weapon,{now:Date.now(),progress:a.progress,catalog:window.GalaWeapons});return ge.ok&&E(yo,JSON.stringify(o.abilities.snapshot())),ge},G=navigator.locks?.request?await navigator.locks.request("myr5-weapon-special",B):B();if(!G.ok){V();return}a.attack(G),window.myr5Creature?.play(G.blocked?"agree":"rest"),te("damageTotal").textContent=G.totalDamage+" DAMAGE",k(),te("damageFloat").textContent=G.blocked?"BLOCKED":"\u2212"+G.damage,te("restFeedback").textContent=G.ability.name+(G.blocked?" \xB7 Shielded":"");let ce=document.querySelector(".encounter");ce.classList.remove("hit"),ce.offsetWidth,ce.classList.add("hit"),clearTimeout(g),g=setTimeout(()=>ce.classList.remove("hit"),650),V()}),te("nextSet").addEventListener("click",()=>{let B=b.suggestion();o.remaining(Date.now())>0||!B||(Z(),n(B))}),te("visitRest").addEventListener("click",()=>{t(),o.previewRest(Date.now(),Number(te("restDuration").value)),Se()}),te("openSettings").addEventListener("click",()=>{te("settings").showModal(),i.say("Pod controls.",{interrupt:!0})}),te("closeSettings").addEventListener("click",()=>te("settings").close()),te("coachPower").addEventListener("change",()=>{P(),i.say(Is[te("coachPower").value].name+" selected.",{interrupt:!0})}),te("restDuration").addEventListener("change",()=>i.say(te("restDuration").value+" seconds between sets.",{interrupt:!0})),te("openIdentity").addEventListener("click",()=>{j(),te("identity").showModal(),i.say("Your Gala character.",{interrupt:!0})}),te("closeIdentity").addEventListener("click",()=>te("identity").close()),te("importGala").addEventListener("change",async B=>{let G=B.target.files?.[0];if(G)try{if(G.size>3e4)throw Error("Choose your exported Gala look file.");let ce=Af(await G.text(),C);if(!E(fi,JSON.stringify(ce)))throw Error("Could not save this appearance on your device.");j(),te("identityStatus").textContent="Saved",i.say("Saved",{interrupt:!0})}catch(ce){te("identityStatus").textContent=ce instanceof SyntaxError?"That file is not a Gala look.":ce.message}finally{B.target.value=""}}),window.addEventListener("storage",B=>{B.key===fi&&j()}),window.addEventListener("mominc-avatar-change",j),window.addEventListener("storage",B=>{B.key===yo&&(o.abilities.merge(B.newValue),o.phase==="rest"&&V())}),document.addEventListener("visibilitychange",()=>{document.hidden?i.cancel():se()}),window.addEventListener("pagehide",()=>{s.dispose(),a.dispose(),clearInterval(f),clearTimeout(g),M.disconnect()}),document.querySelector(".mom-brand").addEventListener("click",B=>{B.preventDefault(),o.phase==="rest"&&Z()}),j(),N(),document.body.dataset.screen="pod";let ie=new URLSearchParams(location.search).get("panel");return["avatar","hand"].includes(ie)&&(te("identity").showModal(),ie==="hand"&&s.edit()),window.addEventListener("myr5:account-progress",({detail:B})=>{o.combat=B.combat,o.progress.completedSets=B.completedSets,E(Gf,JSON.stringify(o.progress));for(let G of te("coachPower").options)G.value!=="shield"&&(G.disabled=!B.unlocks[G.value],G.textContent=Is[G.value].name+(G.disabled?" \xB7 Locked":""));te("coachPower").selectedOptions[0]?.disabled&&(te("coachPower").value="shield"),P(),N()}),window.addEventListener("myr5:round-rejected",({detail:B})=>{_?.id===B.id&&(_=null,x=null,te("setReceipt").textContent=B.message,te("earnedXp").textContent="NO XP",b.render())}),window.addEventListener("myr5:account-progress",({detail:B})=>{_&&B.lastSyncedWorkoutId===_.id&&(_=null,b.render(),o.phase==="rest"&&!o.preview&&(x=(b.suggestion()?.line||mi.limit)+" "+mi.rest,Y())),document.body.dataset.tracking!=="true"&&(te("start").disabled=!b.canStart(h)),b.render()}),{flow:o,workoutOwner:l,configure:L,beginSet:U,consume:Ve,render:R,setGoal:I,canStart:B=>l.canStart()&&b.canStart(B),encouragement:(B,G,ce)=>o.phase==="set"?c.update(B,o.active.goal,G,ce):null,stopped:()=>{o.phase==="set"&&o.leave(),l.stop(),b.render()},goal:()=>Number(te("goal").value)}}function Xf(){let i=document.getElementById("homeCharacter"),e=i.querySelector("canvas"),t=document.getElementById("hud"),n=window.GalaWeapons,s=window.GalaAvatar,r=matchMedia("(prefers-reduced-motion: reduce)");window.GalaWeaponMotion={drawAnimatedWeapon:ho,abilityFor:$n,evolution:Fi};let a,o=0,c=0,l=performance.now(),h=!0,u=!1;function d(){let b;try{b=localStorage}catch{}let C=Cs(b,s).look,A=C.weapon||{type:"rapier",tier:0};C.weapon=n.unlocked(A)?A:{type:A.type,tier:0},a=window.GalaPerformance.create(C),l=performance.now(),i.querySelector("[data-weapon]").textContent=n.name(C.weapon),e.setAttribute("aria-label",`${C.name||"Your Gala character"} with ${n.name(C.weapon)}`),a.paint(e,0,r.matches),y()}function f(){return document.body.dataset.tracking!=="true"&&document.body.dataset.screen!=="rest"}function g(b){o=0,!(u||!f()||!h||document.hidden||document.querySelector("dialog[open]"))&&(b-c>32&&(a.paint(e,b-l,r.matches),c=b),r.matches||(o=requestAnimationFrame(g)))}function y(){let b=f();i.hidden=!b,t.hidden=b,o&&cancelAnimationFrame(o),o=0,!u&&b&&h&&!document.hidden&&(o=requestAnimationFrame(g))}function p(){if(!a?.weapon)return;let b=a.scenes.findIndex(C=>C.name==="weapon");b<0||(l=performance.now()-a.scenes.slice(0,b).reduce((C,A)=>C+A.duration,0),y())}let m=new MutationObserver(y);m.observe(document.body,{subtree:!0,attributes:!0,attributeFilter:["data-tracking","data-screen","open"]});let _=new IntersectionObserver(b=>{h=b[0].isIntersecting,y()});_.observe(i);let x=b=>{b.key===fi&&d()};window.addEventListener("mominc-avatar-change",d),window.addEventListener("myr5:account-progress",d),window.addEventListener("storage",x),document.addEventListener("visibilitychange",y),r.addEventListener("change",y),i.querySelector("button").addEventListener("click",p),d(),window.addEventListener("pagehide",()=>{u=!0,y(),m.disconnect(),_.disconnect(),window.removeEventListener("mominc-avatar-change",d),window.removeEventListener("myr5:account-progress",d),window.removeEventListener("storage",x),document.removeEventListener("visibilitychange",y),r.removeEventListener("change",y)},{once:!0})}Kn();var At=i=>document.getElementById(i),qf=(i,e,t)=>Math.max(e,Math.min(t,i));function Yf(){let i=At("movement"),e=At("exerciseDial"),t=At("goal"),n=At("difficultySlider"),s=null,r=null,a=Gi(i.value),o=new Map;function c(){return Math.max(0,wt.findIndex(y=>y.id===a))}function l(y=c()){let p=wt[y].name;e.style.setProperty("--dial-angle",`${-135+270*y/(wt.length-1)}deg`),e.setAttribute("aria-valuenow",String(y)),e.setAttribute("aria-valuemax",String(wt.length-1)),e.setAttribute("aria-valuetext",p),At("exerciseName").textContent=p}function h(){a=Gi(i.value);let y=xi[a],p=Math.max(0,y.findIndex(C=>C.id===i.value));o.set(a,p),l();let m=t.disabled;e.setAttribute("aria-disabled",String(m));for(let C of["previousExercise","nextExercise","difficultySlider","goalSlider"])At(C).disabled=m;n.max=y.length-1,n.value=p;let _=Rt[i.value]??y[p];n.setAttribute("aria-valuetext",`${_.name}, level ${p+1} of ${y.length}`),n.style.setProperty("--fill",`${100*p/Math.max(1,y.length-1)}%`),At("variationName").textContent=_.name,At("difficultySetting").textContent=`${p+1} / ${y.length}`,At("variationHint").textContent=_.hint,At("trackingScope").textContent="Camera estimates; not a form or safety check. "+_.measurement+" \xB7 "+_.limits;let x=At("goalSlider");x.max=Math.max(0,t.options.length-1),x.value=t.selectedIndex;let b=t.selectedOptions[0];b&&(x.setAttribute("aria-valuetext",b.textContent),At("goalSetting").textContent=b.textContent,At("goalMin").textContent=t.options[0].value,At("goalMax").textContent=t.options[t.options.length-1].value,x.style.setProperty("--fill",`${100*t.selectedIndex/Math.max(1,t.options.length-1)}%`))}function u(y){t.disabled||(window.dispatchEvent(new Event("myr5:exercise-selected")),y!==i.value&&(i.value=y,i.dispatchEvent(new Event("change",{bubbles:!0}))),h())}function d(y){if(t.disabled)return;let p=wt[qf(y,0,wt.length-1)].id;u(Uo(p,o.get(p)??0).id)}function f(y){let p=e.getBoundingClientRect(),m=Math.atan2(y.clientX-p.left-p.width/2,-(y.clientY-p.top-p.height/2))*180/Math.PI;return Math.round((qf(m,-135,135)+135)/270*(wt.length-1))}e.addEventListener("pointerdown",y=>{t.disabled||(y.preventDefault(),e.focus({preventScroll:!0}),s=y.pointerId,e.setPointerCapture(s),r=f(y),l(r))}),e.addEventListener("pointermove",y=>{s===y.pointerId&&(r=f(y),l(r))}),e.addEventListener("pointerup",y=>{if(s!==y.pointerId)return;let p=r;s=r=null,e.releasePointerCapture(y.pointerId),d(p)}),e.addEventListener("pointercancel",()=>{s=r=null,h()}),e.addEventListener("keydown",y=>{let p={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1};y.key in p?(y.preventDefault(),d(c()+p[y.key])):["Home","End"].includes(y.key)&&(y.preventDefault(),d(y.key==="Home"?0:wt.length-1))}),At("previousExercise").onclick=()=>d(c()-1),At("nextExercise").onclick=()=>d(c()+1),n.addEventListener("input",()=>u(Uo(a,n.value).id)),At("goalSlider").addEventListener("input",()=>{t.disabled||(t.selectedIndex=Number(At("goalSlider").value),t.dispatchEvent(new Event("change",{bubbles:!0})),h())}),i.addEventListener("change",h),t.addEventListener("change",h),window.addEventListener("myr5:movement-configured",h);let g=new MutationObserver(h);g.observe(t,{attributes:!0,attributeFilter:["disabled"],childList:!0}),window.addEventListener("pagehide",()=>g.disconnect()),h()}Sh();var oe=i=>document.getElementById(i),yt=oe("v"),Cn=oe("c"),Jh=Cn.getContext("2d");new URLSearchParams(location.search).has("debug")&&(oe("trackingDiag").hidden=!1);var nt=new oo(i=>{oe("coachCaption").textContent=i,oe("restScreen").hidden||(oe("restFeedback").textContent=i)},i=>oe("voiceType").textContent=i),Ap=new ao;document.addEventListener("pointerdown",()=>nt.unlock(),{capture:!0});document.addEventListener("keydown",()=>nt.unlock(),{capture:!0});nt.available||(oe("voiceType").textContent="Speech unavailable in this browser",oe("toggleVoice").disabled=!0);var Vt=null,Us=null,Sr=null,Ds=null,$h=null,In=null,Tp=0,Zt=0,jh=-1,wr=0,Eo=0,Ao=0,Kh=0,Hi=new Fs("squat"),Ae={version:"pod-1",phase:"idle",frames:0,poses:0,inferenceMs:0,rate:0,camera:null,delegate:null,error:null,motion:Hi.snapshot()};window.myr5TestState=Ae;function gi(i){oe("status").textContent!==i&&(oe("status").textContent=i),oe("status").hidden=i==="Ready"}var Mr=i=>`${Math.floor(i/60)}:${String(Math.floor(i%60)).padStart(2,"0")}`;function Er(i){oe("start").disabled=i||Vt?.canStart(oe("movement").value)===!1,oe("camera").disabled=i&&Ae.phase!=="tracking",oe("stop").disabled=!i,oe("goal").disabled=i,oe("restDuration").disabled=i,oe("widest").disabled=!In||Ae.phase!=="tracking",document.body.dataset.tracking=String(i),oe("previewLabel").textContent=Ae.phase==="tracking"?"TRACKING":"CAMERA"}async function Rp(){let i=await vf(),e=oe("camera").value;return oe("camera").querySelectorAll("option[data-device]").forEach(t=>t.remove()),i.forEach((t,n)=>{let s=document.createElement("option");s.value=yr(t.id),s.dataset.device="",s.textContent=t.label||`Camera ${n+1}`,oe("camera").append(s)}),[...oe("camera").options].some(t=>t.value===e)&&(oe("camera").value=e),i}async function Cp(i){let e=[];try{e=await Rp()}catch{}let t=await io(i);if(!In||!In.getTracks().includes(i))return;let n=bf(i,e,t),s=i.getSettings().deviceId;e.some(r=>r.id===s)&&(oe("camera").value=yr(s)),oe("lensInfo").textContent=n.label+" \xB7 "+(t.applied?`widest exposed zoom ${t.zoom}\xD7`:t.supported?"Wider zoom could not be applied.":"This lens exposes no zoom control.")+" Follow the camera cue for your exercise.",oe("cameraDetails").textContent=JSON.stringify(n,null,2),fetch("/camera-info",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)}).catch(()=>{})}function Ro(){if(cancelAnimationFrame(Tp),Us){try{Us.close()}catch{}Us=null}Sr=null,In?.getTracks().forEach(i=>i.stop()),In=null,yt.pause(),yt.srcObject=null,Jh.clearRect(0,0,Cn.width,Cn.height),Ae.camera=null,Ae.delegate=null,Ae.rate=0}function yi(){Ap.reset();let i=oe("movement").value,e=Ct[i];Vt?.configure(i);let t=["pace","steps","jumps"].includes(e.kind);oe("roundControl").hidden=!t,Hi=new Fs(i),Ae.motion=Hi.snapshot(),oe("hint").textContent=e.hint,To(Ae.motion),window.dispatchEvent(new Event("myr5:movement-configured")),gi(Ae.phase==="tracking"?e.hint:"Ready")}function To(i){oe("movementName").textContent=i.name;let e=i.kind==="hold"?"hold time":i.kind==="pace"?"active time":i.kind==="steps"?"steps":i.kind==="jumps"?"jumps":"reps";mo(oe("primary"),i.kind==="hold"?_r(i.totalHold):i.kind==="pace"?_r(i.active):Uf(i.count),e),oe("primaryLabel").textContent=e;let t=i.remaining===null?`Session ${Mr(i.elapsed)}`:`Remaining ${Mr(i.remaining)}`;oe("secondary").textContent=i.kind==="hold"?`Best ${Mr(i.bestHold)} \xB7 Total ${Mr(i.totalHold)}`:i.kind==="pace"?`Moving ${Mr(i.active)} \xB7 Hand pace ${i.speed.toFixed(1)}\xD7`:i.kind==="steps"||i.kind==="jumps"?`${t} \xB7 ${Math.round(i.cadence)}/${i.kind==="steps","min"}`:t,oe("activity").style.width=`${Math.round(i.progress*100)}%`,oe("measurement").textContent=i.measurement,oe("jointReadings").textContent=i.jointReadings||"",oe("countState").textContent=i.tracking?["squat","pushup","jumping"].includes(i.mode)&&!i.calibrated?"Setting start":i.phase==="bottom"?"Return to start to count":i.kind==="hold"?"Hold timer":i.kind==="pace"?"Round timer":"Counter ready":"Waiting for joints",oe("paceNote").hidden=i.kind!=="pace",Vt?.render(i)}function ks(i="Stopped."){nt.cancel(),Zt++,Ro(),Er(!1),Ae.phase="idle",gi(i),oe("countState").textContent="Camera stopped",oe("detail").textContent="Camera off \xB7 Tracker closed",Vt?.stopped()}function So(i,e,t){let n;return Promise.race([i,new Promise((s,r)=>{n=setTimeout(()=>r(new Error(t)),e)})]).finally(()=>clearTimeout(n))}async function Qh(){let i=++Zt;Ro(),Ae.phase="camera",Er(!0),Ae.error=null,yi(),oe("trainingView").scrollIntoView({block:"start",behavior:"auto"}),Ae.frames=0,Ae.poses=0,Ae.inferenceMs=0,gi("Opening camera\u2026"),nt.say("Get into position.",{interrupt:!0}),oe("detail").textContent="Waiting for video";try{if(await Vt.beginSet(Hi.mode),i!==Zt)return;if(!navigator.mediaDevices?.getUserMedia)throw new Error("Open Coach over HTTPS to use the camera.");let e=oe("camera").value,t=await to(e);if(i!==Zt){t.getTracks().forEach(a=>a.stop());return}if(In=t,yt.srcObject=In,yt.muted=!0,await So(yt.play(),1e4,"No video. Try the other camera."),i!==Zt||(Ae.camera=no(In.getVideoTracks()[0],e),yt.style.transform=Cn.style.transform=Ae.camera==="user"?"scaleX(-1)":"none",await Cp(In.getVideoTracks()[0]),i!==Zt)||(gi("Loading tracker\u2026"),oe("detail").textContent=`Video ${yt.videoWidth} \xD7 ${yt.videoHeight}`,Ae.phase="model",Ds=Ds||await So(import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"),2e4,"Tracker didn\u2019t download. Check your connection."),i!==Zt)||($h=$h||await So(Ds.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"),2e4,"Tracker didn\u2019t download. Check your connection."),i!==Zt))return;let n=!1,s=Ds.PoseLandmarker.createFromOptions($h,{baseOptions:{modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"CPU"},runningMode:"VIDEO",numPoses:1});s.then(a=>{(i!==Zt||n)&&a.close()},()=>{});let r;try{r=await So(s,6e4,"Tracker took too long. Tap Begin to retry.")}catch(a){throw n=!0,a}if(i!==Zt)return;Us=r,Sr=new Ds.DrawingUtils(Jh),Ae.delegate="CPU",Ae.phase="tracking",Er(!0),jh=-1,wr=0,Eo=0,Ao=performance.now(),Kh=0,gi(Ct[Hi.mode].hint),nt.say(Ct[Hi.mode].hint,{interrupt:!0}),Ip(i)}catch(e){if(i!==Zt)return;Zt++,Ro(),Er(!1),Vt.stopped(),Ae.phase="error",Ae.error=e.message,gi(e.name==="NotAllowedError"?"Allow camera access, then tap Begin.":e.message),nt.say(oe("status").textContent,{interrupt:!0}),oe("detail").textContent="Camera off \xB7 Tracker closed"}}async function Ip(i){if(!(i!==Zt||!Us))try{let e=performance.now();if(yt.readyState>=2&&yt.currentTime!==jh){jh=yt.currentTime,(Cn.width!==yt.videoWidth||Cn.height!==yt.videoHeight)&&(Cn.width=yt.videoWidth,Cn.height=yt.videoHeight),Jh.clearRect(0,0,Cn.width,Cn.height);let t=performance.now(),n=Us.detectForVideo(yt,e),s=performance.now()-t;Ae.frames++,wr++,Eo+=s,Ae.poses=n.landmarks.length;let r=n.landmarks[0]?.slice(0,27);r&&(Sr.drawConnectors(r,Ds.PoseLandmarker.POSE_CONNECTIONS.filter(l=>l.start<=26&&l.end<=26),{color:"#bc89ff",lineWidth:3}),Sr.drawLandmarks(r.filter(l=>l.visibility>=.45),{color:"#aaffd9",radius:3}),Sr.drawLandmarks(r.filter(l=>l.visibility<.45),{color:"#ffad66",radius:3})),Ae.motion=Hi.update(r,e,yt.videoWidth/yt.videoHeight,n.worldLandmarks?.[0]);let a=["hold","pace"].includes(Ae.motion.kind)?{...Ae.motion,remaining:Math.max(0,Vt.goal()-(Ae.motion.kind==="hold"?Ae.motion.totalHold:Ae.motion.active))}:Ae.motion,o=Ap.update(a,e),c=Vt.encouragement(Ae.motion,e,o);c&&o.push(c);for(let l of o)window.dispatchEvent(new CustomEvent("myr5:cue",{detail:{key:l.key==="encouragement"?"time":l.key}})),nt.say(l.text,{key:l.key,interrupt:l.key==="complete"||l.key==="ready"});if(await Vt.consume(Ae.motion,Date.now())){To(Ae.motion),Co.play("post");return}if(e-Ao>=1e3&&(Ae.rate=wr*1e3/(e-Ao),Ae.inferenceMs=Eo/wr,wr=0,Eo=0,Ao=e),e-Kh>=160&&(To(Ae.motion),gi(Ae.motion.message),oe("detail").textContent=`${Ae.rate.toFixed(0)} tracking updates/s \xB7 ${Ae.inferenceMs.toFixed(0)} ms/update \xB7 ${yt.videoWidth} \xD7 ${yt.videoHeight}`,Kh=e),Ae.motion.complete){To(Ae.motion),ks("Round complete."),nt.say("Round complete. Well done.",{interrupt:!0});return}}Tp=requestAnimationFrame(()=>Ip(i))}catch(e){Zt++,Ro(),Er(!1),Vt.stopped(),nt.cancel(),Ae.phase="error",Ae.error=e.message,gi("Tracking stopped: "+e.message),nt.say(oe("status").textContent,{interrupt:!0}),oe("detail").textContent="Camera off \xB7 Tracker closed"}}for(let[i,e]of Object.entries(Ct)){let t=document.createElement("option");t.value=i,t.textContent=e.name,oe("movement").appendChild(t)}oe("start").addEventListener("click",()=>Io.introduce());oe("stop").addEventListener("click",()=>{ks(),nt.say("Stopped.",{interrupt:!0})});oe("reset").addEventListener("click",()=>{yi(),nt.say("Count reset. Return to your starting position.",{interrupt:!0})});oe("goal").addEventListener("change",()=>{yi(),nt.say("Set goal. "+oe("goal").selectedOptions[0].textContent+".",{interrupt:!0})});oe("movement").addEventListener("change",i=>{let e=Ae.phase==="tracking";i.detail?.automatic||window.dispatchEvent(new Event("myr5:exercise-selected")),yi(),nt.say(Ct[oe("movement").value].name+" selected.",{interrupt:!0}),e&&Io.introduce()});oe("duration").addEventListener("change",()=>{yi(),nt.say(Number(oe("duration").value)?oe("duration").value+" second round.":"Open timer.",{interrupt:!0})});function eu(){oe("toggleVoice").textContent=nt.enabled?"ON":"OFF",oe("toggleVoice").dataset.on=String(nt.enabled),oe("toggleVoice").setAttribute("aria-checked",String(nt.enabled))}oe("toggleVoice").addEventListener("click",()=>{nt.setEnabled(!nt.enabled),eu(),nt.say(nt.enabled?"Voice on.":"Voice off.",{interrupt:!0})});oe("testVoice").addEventListener("click",()=>{nt.setEnabled(!0),eu(),nt.say("Coach ready. Move at your own pace. One. Two. Three. Thirty seconds left.",{interrupt:!0})});oe("camera").addEventListener("change",()=>{nt.say("Camera selected.",{interrupt:!0}),Ae.phase==="tracking"&&Qh()});oe("widest").addEventListener("click",async()=>{let i=In?.getVideoTracks()[0];if(i){oe("widest").disabled=!0;try{let e=await Rp(),t=xf(e);Ae.camera!=="user"&&t&&i.getSettings().deviceId!==t.id?(oe("camera").value=yr(t.id),await Qh()):(await Cp(i),Ae.phase==="tracking"&&yi())}catch(e){oe("lensInfo").textContent="Could not change the lens: "+e.message}finally{oe("widest").disabled=Ae.phase!=="tracking"}}});window.addEventListener("pagehide",()=>ks());document.addEventListener("visibilitychange",()=>{document.hidden&&Ae.phase!=="idle"&&ks("Paused. Tap Begin to continue.")});Vt=Wf({voice:nt,movements:Ct,onStop:()=>ks("Set ended."),onNext:async i=>{await Io.introduce(i?.mode),i&&Vt.setGoal(i.goal)}});window.myr5WorkoutOwner=Vt.workoutOwner;window.dispatchEvent(new Event("myr5:workout-owner-ready"));window.myr5CreatePackControl=async i=>{let{createIsolatedPackControl:e}=await Promise.resolve().then(()=>(Oh(),sp));return e({...i,workoutOwner:Vt.workoutOwner})};yi();Yf();eu();var Io=Sf({movements:Ct,voice:nt,onOpen:()=>ks("Paused."),onSelect:i=>{oe("movement").value=i,window.dispatchEvent(new Event("myr5:exercise-selected")),yi()},onStart:()=>{document.hidden||Qh()},camera:()=>oe("camera").value,movement:()=>oe("movement").value});oe("movementRow").addEventListener("click",()=>Io.introduce(oe("movement").value));Xf();var Co={play(){}},Ep=!1,Zh=null;async function tu(){if(Ep||window.myr5VerifiedOptionalAccess!==!0)return!1;Ep=!0;for(let e of["/creature/phone.css","/creature/cinematics.css","/pod/hardware.css","/hardware-launch.css","/pocket-hardware.css","/hand-companion.css"]){let t=document.createElement("link");t.rel="stylesheet",t.href=e,document.head.append(t)}for(let e of document.querySelectorAll("[data-optional-src]"))e.src=e.dataset.optionalSrc;let{initCinematics:i}=await Promise.resolve().then(()=>(cp(),op));return Co=i({voice:nt}),window.dispatchEvent(new Event("myr5:optional-materials-ready")),window.myr5Cinematics=Co,!0}oe("openSettings").addEventListener("click",()=>{tu()},{once:!0});oe("openIdentity").addEventListener("click",()=>{tu()},{once:!0});oe("manageMaterials").addEventListener("click",async()=>{let i=oe("materialsStatus");if(!await tu()){i.textContent="Complete Coach setup to unlock materials.";return}try{let{mountMaterialControls:e}=await Promise.resolve().then(()=>(Sp(),wp));oe("materialControls").hidden=!1,Zh??=e({account:window.myr5AuthenticatedAccount,workoutOwner:Vt.workoutOwner}),i.textContent=Zh?"Material controls ready.":"Material controls unavailable."}catch(e){i.textContent=e.message}});window.myr5Cinematics=Co;window.addEventListener("pagehide",()=>Zh?.dispose(),{once:!0});
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2024 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
