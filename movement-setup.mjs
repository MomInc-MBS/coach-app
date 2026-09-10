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
 const position=d==='sideplank'?'Chest toward camera':m.view==='side'?'Side view':m.view==='angle'?'Slight angle':'Front view';
 const placement=floor?'Phone low · steady support':'Phone at waist height · steady support';
 const framing=['pushup','hinge','split','bridge','plank'].includes(d)?`${side[0].toUpperCase()+side.slice(1)} clear · room to move`:'Keep these in frame as you move.';
 return {position,placement,framing,joints,feet:'Feet and ankles are not tracked.'};
}
