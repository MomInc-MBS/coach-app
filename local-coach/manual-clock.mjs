export class ManualActiveClock{
 constructor({now=()=>performance.now(),visible=()=>!document.hidden}={}){this.now=now;this.visible=visible;this.elapsed=0;this.last=null;this.running=false;}
 start(elapsed=0){this.elapsed=Math.max(0,Number(elapsed)||0);this.last=this.now();this.running=true;return this.elapsed;}
 sample(){const current=this.now();if(this.running&&this.visible()&&this.last!==null)this.elapsed+=Math.max(0,(current-this.last)/1000);this.last=current;return this.elapsed;}
 pause(){this.sample();this.running=false;return this.elapsed;}
 resume(){this.last=this.now();this.running=true;return this.elapsed;}
}

export class ManualStartGate{
 constructor(){this.pending=Promise.resolve();this.pausePending=null;}
 run(task){this.pausePending=null;this.pending=Promise.resolve().then(task);return this.pending;}
 pause(task){this.pausePending??=this.pending.then(task);return this.pausePending;}
}
