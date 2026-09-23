// Whether it is OK to surface an Armie letter right now (an in-app toast, or
// answering the service worker's "can I show this push?" check). Reads flags
// that camera-workout.mjs and app.mjs already set on document.body -- no
// edits to either file, this just observes them:
//   dataset.cameraWorkout === 'true'  while the camera-only stage is up
//   dataset.tracking === 'true'       while a set is actively being tracked
// D23: "nothing appears during camera-only mode; a push arriving mid-workout
// is held until the set ends."
export function armieNotifyBlocked(doc = typeof document !== 'undefined' ? document : null) {
 const flags = doc?.body?.dataset;
 return !!flags && (flags.cameraWorkout === 'true' || flags.tracking === 'true');
}
