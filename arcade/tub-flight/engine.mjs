export const WIDTH=320,HEIGHT=420,TARGET=8;
// endless ramp: every 3 pipes the gap narrows 2px (half-gap) and speed rises 4px/s, capped at level 8 (half 59, speed 140) so it stays phone-playable
export const level=score=>Math.min(8,Math.floor(score/3)),gapHalf=score=>75-2*level(score),speed=score=>108+4*level(score);
export class TubFlight {
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.phase='ready';this.y=210;this.velocity=0;this.pipes=[];this.score=0;this.elapsed=0;this.spawnIn=0;this.powder=0;this.lastDose=null;return this;}
 flap(){if(this.phase==='crashed')return false;if(this.phase==='ready'){this.phase='running';this.spawnIn=.8;}this.velocity=-245;return true;}
 spawn(){this.pipes.push({x:WIDTH+26,gap:122+this.random()*145,half:gapHalf(this.score),passed:false});}
 step(seconds){if(this.phase!=='running')return;let left=Math.min(.1,Math.max(0,seconds));while(left>0&&this.phase==='running'){const dt=Math.min(left,1/120);left-=dt;this.elapsed+=dt;this.velocity+=690*dt;this.y+=this.velocity*dt;this.spawnIn-=dt;if(this.spawnIn<=0){this.spawn();this.spawnIn=205/speed(this.score);}
   if(this.y<20||this.y>HEIGHT-36){this.phase='crashed';break;}
   for(const pipe of this.pipes){pipe.x-=speed(this.score)*dt;const h=pipe.half;const overlaps=82+13>pipe.x&&82-13<pipe.x+44;if(overlaps&&(this.y-13<pipe.gap-h||this.y+13>pipe.gap+h)){this.phase='crashed';break;}if(!pipe.passed&&pipe.x+44<82-13){pipe.passed=true;this.score++;this.powder=Math.min(this.score,TARGET);this.lastDose={x:pipe.x+22,y:pipe.gap-h,at:this.elapsed};}}
   this.pipes=this.pipes.filter(pipe=>pipe.x>-60);
  }
 }
}
