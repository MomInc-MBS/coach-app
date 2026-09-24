// W2-2P (#137): TV touch effect + CRT curve + scan lines on the Settings terminal screen only —
// never the bezel (border/box-shadow/corner bolts) or the SATCOM top / BUILD bottom strips that
// settings-frame.css (#107, lane 2L) owns. Two pointer-events:none overlays are appended as the
// LAST children of #settings: a dialog shown via showModal() renders in the browser's "top layer",
// and everything painted there — including these position:fixed descendants — stays layered above
// the rest of the page and above the dialog's own earlier children, so this doesn't need its own
// z-index arms race with the app.
//
// "Screen rect" = the dialog's own box, inset from its border (clears the bezel) and from the top
// strip's bottom edge / bottom strip's top edge (clears the labels + BUILD strip). #settings scrolls
// (.terminal-menu; overflow:auto), with the top strip scrolling away and the bottom strip pinned via
// position:sticky, so the rect is recomputed on open, resize and scroll rather than measured once.
//
// Touch effect: ported from site-hint tv/tv.js:173-207 "press into the glass" (tv.css .press /
// .press-layer) — the growing radial glass-touch spot only. The site's screen-wide scale/sink
// (tv.js grow(), scaling #screen toward the touch point) is skipped: #settings is full of real
// controls, and the brief calls for a pure overlay that never blocks or delays the tap underneath,
// so nothing about the dialog itself moves.
// ponytail: single CSS keyframe instead of the site's rAF hold-tracking loop — good enough for a
// tap; add hold-based growth (mirroring tv.js grow()) if Ian wants press-and-hold sizing later.
//
// Conductor pass on 0a450a2: the first cut inset the overlay by the border width PLUS 8px to clear
// the corner bolts, which left a visible seam — a strip of plain dialog background between the real
// screen edge and the vignette's own (darker) edge. Insetting by the border width only makes the
// overlay meet the screen edge cleanly, at the cost of the vignette's corner darkening sitting over
// the bolts near the very corner — an acceptable trade since that's what buys the flush edge.

export function mountSettingsCrt(settings){
 const screen=document.createElement('div');screen.className='crt-screen';screen.setAttribute('aria-hidden','true');
 screen.innerHTML='<div class="crt-vignette"></div><div class="crt-scanlines"></div><div class="crt-scan-band"></div>';
 const touch=document.createElement('div');touch.className='crt-touch-layer';touch.setAttribute('aria-hidden','true');
 settings.append(screen,touch);

 function place(){
  const r=settings.getBoundingClientRect();
  if(!r.width){screen.style.width=touch.style.width='0px';return;}
  const inset=parseFloat(getComputedStyle(settings).borderTopWidth)||0;
  const top=settings.querySelector('.satcom-top')?.getBoundingClientRect()??{bottom:r.top+inset};
  const bottom=settings.querySelector('.satcom-bottom')?.getBoundingClientRect()??{top:r.bottom-inset};
  const left=r.left+inset,right=r.right-inset;
  const y0=Math.max(top.bottom,r.top+inset),y1=Math.min(bottom.top,r.bottom-inset);
  for(const el of [screen,touch]){
   el.style.left=left+'px';el.style.top=y0+'px';
   el.style.width=Math.max(0,right-left)+'px';el.style.height=Math.max(0,y1-y0)+'px';
  }
 }
 place();
 document.getElementById('openSettings')?.addEventListener('click',()=>requestAnimationFrame(place));
 settings.addEventListener('scroll',place,{passive:true});
 addEventListener('resize',place);

 settings.addEventListener('pointerdown',event=>{
  if(event.target.closest('.satcom-strip'))return;
  const r=touch.getBoundingClientRect();
  if(!r.width||event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)return;
  const mark=document.createElement('span');mark.className='settings-touch-mark';
  mark.style.left=(event.clientX-r.left)+'px';mark.style.top=(event.clientY-r.top)+'px';
  touch.append(mark);
  const remove=()=>mark.remove();
  mark.addEventListener('animationend',remove);
  setTimeout(remove,700); // reduced motion fires no animationend; this still cleans it up
 },{passive:true});
}
