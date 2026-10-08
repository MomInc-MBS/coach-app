// Activity is local to the coach window; scrolling the customizer does not cover it again.
export function mountPreviewIdle(bay:HTMLElement,delay=3000){
 let timer:ReturnType<typeof setTimeout>|undefined;
 const pointers=new Set<number>(),events=new AbortController();
 const schedule=()=>{clearTimeout(timer);if(!pointers.size)timer=setTimeout(()=>bay.dataset.idle='true',delay);};
 const show=()=>{bay.dataset.idle='false';schedule();};
 bay.addEventListener('pointerdown',event=>{pointers.add(event.pointerId);show();},{signal:events.signal});
 bay.addEventListener('pointermove',show,{signal:events.signal});
 const release=(event:PointerEvent)=>{if(pointers.delete(event.pointerId))show();};
 window.addEventListener('pointerup',release,{signal:events.signal});
 window.addEventListener('pointercancel',release,{signal:events.signal});
 for(const type of ['wheel','focusin','keydown','input'])bay.addEventListener(type,show,{signal:events.signal});
 show();
 return ()=>{clearTimeout(timer);events.abort();};
}
