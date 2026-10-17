const CSS=`#cameraWorkout.runner-on>video{inset:auto;right:6px;bottom:max(6px,env(safe-area-inset-bottom));width:22vw;max-width:92px;height:auto;aspect-ratio:3/4;object-fit:cover;z-index:2;border-radius:10px;border:2px solid #fff8;box-shadow:0 4px 12px #000a;background:#000}
#cameraWorkout.runner-on #coachOverlay{visibility:hidden}
#cameraWorkout.runner-on .workout-performance-controls{left:6px;right:auto;bottom:max(6px,env(safe-area-inset-bottom));margin:0;padding:3px;gap:4px;background:#0008;border-radius:10px}
#cameraWorkout.runner-on .workout-performance-controls button,#cameraWorkout.runner-on .workout-performance-controls select{padding:4px 8px;font-size:12px;min-height:32px}
#cameraWorkout.runner-on .camera-workout-housing{filter:hue-rotate(var(--runner-hue,0deg)) saturate(1.25);transition:filter .6s}
#cameraWorkout .runner-layer{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
#cameraWorkout .runner-layer canvas.runner-view{position:absolute;inset:0;width:100%;height:100%;display:block}
#cameraWorkout .runner-flash{position:absolute;inset:0;background:radial-gradient(ellipse at center,#ff001840 20%,#ff0018ee);opacity:0}
#cameraWorkout .runner-flash.on{animation:runner-flash .9s ease-out}
@keyframes runner-flash{from{opacity:1}to{opacity:0}}
#cameraWorkout .runner-chaser{display:none}
#cameraWorkout .runner-say{position:absolute;z-index:4;top:calc(max(24px,env(safe-area-inset-top)) + 110px);left:8px;right:8px;display:flex;justify-content:center;pointer-events:none}
#cameraWorkout .runner-say[hidden]{display:none}
#cameraWorkout .runner-say canvas{max-width:100%;height:auto!important;filter:drop-shadow(0 4px 6px #000a)}
#cameraWorkout .runner-say.pop{animation:runner-pop .42s cubic-bezier(.3,1.6,.5,1) both}
@keyframes runner-pop{from{opacity:0;transform:translateY(-14px) scale(.6) rotate(-3deg)}to{opacity:1;transform:none}}
#cameraWorkout .runner-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
#cameraWorkout .runner-stopped{position:absolute;z-index:5;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;pointer-events:none;background:#40000c80;text-align:center}
#cameraWorkout .runner-stopped[hidden]{display:none}
#cameraWorkout .runner-stopped b{font:900 clamp(40px,13vw,72px)/.95 system-ui,sans-serif;color:#fff;-webkit-text-stroke:3px #ff0030;text-shadow:0 0 18px #ff0030,0 6px 0 #5a0010;letter-spacing:.02em;animation:runner-stop-pulse .8s ease-in-out infinite alternate}
#cameraWorkout .runner-stopped span{font:800 18px/1.2 system-ui,sans-serif;color:#ffe3e8;text-shadow:0 2px 4px #000}
@keyframes runner-stop-pulse{from{transform:scale(.96)}to{transform:scale(1.04)}}
@media(prefers-reduced-motion:reduce){#cameraWorkout .runner-stopped b{animation:none}}
@media(prefers-reduced-motion:reduce){#cameraWorkout .runner-say.pop,#cameraWorkout .runner-flash.on{animation:none}#cameraWorkout .runner-chaser{transition:none}}`;

export {CSS};
