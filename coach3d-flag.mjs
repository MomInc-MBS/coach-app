// Ian, 16 Oct: the 3D coach in camera workouts and the rest scene is on the back burner ("throws off the vibes").
// Default: he only joins a workout once the exercise's aura reaches COACH_AURA_LEVEL (small, at the side, idle) and
// leaves at rest or when the set ends. localStorage myr5Coach3d='1' forces the old always-on full coach (testing).
// Until level 3 his assets are never loaded; the rest scene shows the 64-bit coach sprite instead.
export const COACH_AURA_LEVEL=3;
// Aura-entrance placement (share of the screen): small, bottom-right, clear of the camera subject. Tune on a real phone.
export const COACH_AURA_PLACE={heightPct:.26,rightPct:.02,bottomPct:.2,enterMs:550,leaveMs:350};
export const COACH_3D_KEY='myr5Coach3d';
export function coach3dEnabled(){try{return localStorage.getItem(COACH_3D_KEY)==='1';}catch{return false;}}
