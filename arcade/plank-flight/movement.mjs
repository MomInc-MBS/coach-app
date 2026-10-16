// One eligibility boundary feeds the hold clock and the flight controller.
// These are camera heuristics, not a measurement of floor contact or arm loading.
import {PLANK_TUNING} from './pose-input.mjs';
export function applyFlightEvidence(session, pose, timestamp, {allowed=false,maxGap=PLANK_TUNING.freshnessMs/1000}={}) {
  const now=timestamp/1000,last=session.flightLast;
  if(!Number.isFinite(now)||now<0||(Number.isFinite(last)&&now<=last)){
    session.flightPose=pose;session.flightEligible=false;session.hold=0;session.tracking=false;session.phase='ready';session.message=pose?.reason||'Waiting for a fresh camera frame.';
    return false;
  }
  session.flightLast=now;session.flightPose=pose;
  const dt=Number.isFinite(now)&&Number.isFinite(last)&&now>last&&now-last<=maxGap?now-last:0;
  const resting=pose?.resting===true||pose?.posture==='rest';
  const eligible=!!(allowed&&!resting&&pose?.exerciseEligible&&pose?.controlValid&&pose?.calibrated);
  const was=session.flightEligible===true;session.flightEligible=eligible;
  if(session.started===null&&pose?.calibrated)session.started=now;
  session.elapsed=session.started===null?0:Math.max(0,now-session.started);
  if(eligible&&was&&dt>0){session.hold+=dt;session.totalHold+=dt;session.active+=dt;session.bestHold=Math.max(session.bestHold,session.hold);}
  else if(!eligible||dt===0)session.hold=0;
  session.base=pose?.calibrated?{}:null;session.tracking=eligible;
  session.phase=eligible?'holding':pose?.calibrated?'ready':'calibrating';
  session.setupProgress=pose?.calibrationProgress??0;session.progress=pose?.height01??0;
  session.message=(!pose?.controlValid?pose?.reason:null)||pose?.prompt||pose?.reason||(eligible?'Fly at your own pace.':'Get into position.');
  if(pose?.controlValid&&!eligible&&resting)session.message='Resting position estimated. Flight continues; exercise credit is paused.';
  else if(pose?.controlValid&&!pose?.exerciseEligible)session.message='Practice only. Show your hips and knees for workout credit.';
  session.measurement='Face-on pose estimate · arm pressure and floor contact are not measured.';
  return eligible;
}
