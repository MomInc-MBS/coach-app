// Ian, 16 Oct: the 3D coach in camera workouts and the rest scene is on the back burner ("throws off the vibes").
// One switch: localStorage myr5Coach3d='1' brings it back (reload). Off = its assets are never loaded for a workout
// and the rest scene shows the 64-bit coach sprite instead. The ship view / customizer still use the 3D coach.
export const COACH_3D_KEY='myr5Coach3d';
export function coach3dEnabled(){try{return localStorage.getItem(COACH_3D_KEY)==='1';}catch{return false;}}
