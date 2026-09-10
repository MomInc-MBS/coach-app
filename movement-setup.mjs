// Camera instructions describe the joints used by Coach, never feet or ankles.
export function movementSetup(m){
 const d=m.detector,side=m.side?`${m.side} side`:'near side';
 let joints=['Shoulders','Hips','Both knees'];
 if(d==='pushup')joints=['Shoulder','Elbow','Wrist','Hip'];
 else if(d==='squat'||m.id==='jumping')joints=['Shoulders','Hips'];
 else if(['hinge','split','bridge'].includes(d))joints=['Shoulder','Hip','Knee'];
 else if(d==='plank')joints=['Shoulder','Elbow','Wrist','Hip','Knee'];
 else if(d==='sideplank')joints=['Both shoulders','Both hips','Supporting elbow','Supporting knee'];
 else if(['raise','press','boxing'].includes(d))joints=['Both shoulders','Both elbows','Both wrists','Hips'];
 else if(d==='yoga'||d==='jack'||(d==='balance'&&m.overhead))joints=['Shoulders','Elbows','Wrists','Hips','Both knees'];
 const floor=['bridge','plank','sideplank'].includes(d)||(d==='pushup'&&!m.incline);
 const position=d==='sideplank'?'Face your chest toward the camera':m.view==='side'?'Camera beside you':m.view==='angle'?'Camera at a slight angle':'Face the camera';
 const placement=floor?'Set your phone low on a steady support, aimed across your body.':'Set your phone upright on a steady support around waist height.';
 const framing=['pushup','hinge','split','bridge','plank'].includes(d)?`Keep the ${side} clear. Leave room for the whole movement.`:'Move back until every part listed below stays in view as you move.';
 return {position,placement,framing,joints,feet:'Feet and ankles are not tracked.'};
}
