// One pending camera callback, cancelled when the set stops. Prefer fresh decoded frames.
export class PoseFrameScheduler {
 constructor(video,{request=requestAnimationFrame,cancel=cancelAnimationFrame}={}){this.video=video;this.request=request;this.cancel=cancel;this.id=null;this.videoFrame=false;this.frame=null;}
 schedule(callback){
  this.stop();this.videoFrame=typeof this.video.requestVideoFrameCallback==='function';
  const run=(time,metadata)=>{this.id=null;this.frame=metadata??null;callback();};
  this.id=this.videoFrame?this.video.requestVideoFrameCallback(run):this.request(run);
 }
 stop(){if(this.id!==null){if(this.videoFrame)this.video.cancelVideoFrameCallback(this.id);else this.cancel(this.id);this.id=null;}}
}
