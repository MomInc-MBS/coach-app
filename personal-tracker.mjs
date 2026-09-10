export function renderPersonalTracker(plate,profile,targets,exerciseNames,progress){
 if(!plate.dataset.mounted){
  plate.className='mom-tracker';plate.setAttribute('aria-labelledby','personalTrackerTitle');
  plate.innerHTML=`<header class="tracker-brand"><img src="/pod/mom-inc-mark.png" alt=""><div><span>MOM INC.</span><h2 id="personalTrackerTitle">Personal tracker</h2></div><span class="tracker-unit" aria-hidden="true">MYR5</span></header>
   <div class="tracker-identity"><div class="tracker-member"><span class="tracker-label">Crew member</span><p data-tracker="name"></p></div><div class="tracker-day"><span>Day</span><strong data-tracker="day"></strong></div></div>
   <div class="tracker-record"><span class="tracker-label">Training record</span><p><strong id="trackerCompletedSets">0</strong> total sets logged</p></div>
   <h3 class="tracker-target-title">Today’s targets</h3><dl class="tracker-targets">
    <div><dt>Reps / set</dt><dd><strong data-tracker="reps"></strong><span>reps</span></dd></div>
    <div><dt>Hold / set</dt><dd><strong data-tracker="hold"></strong><span>sec</span></dd></div>
    <div data-nutrition-target><dt>Protein</dt><dd><strong data-tracker="protein"></strong><span>g / day</span></dd></div>
    <div data-nutrition-target><dt>Water</dt><dd><strong data-tracker="water"></strong><span>oz / day</span></dd></div>
   </dl><div class="tracker-focus"><span class="tracker-label">Your program</span><p data-tracker="exercises"></p></div>
   <footer class="tracker-footer"><span>MOM / TRAINING DECK</span><a href="/onboarding.html?edit=1">Coach settings ↗</a></footer>`;
  plate.dataset.mounted='true';
 }
 const values={name:profile.name,day:String(targets.day).padStart(2,'0'),reps:targets.reps,hold:targets.holdSeconds,protein:targets.proteinGrams,water:targets.waterOz,exercises:profile.exercises.map(k=>exerciseNames[k]||k).join(' · ')};
 for(const [key,value]of Object.entries(values))plate.querySelector(`[data-tracker="${key}"]`).textContent=value??'—';
 for(const tile of plate.querySelectorAll('[data-nutrition-target]'))tile.hidden=!targets.proteinGrams;
 updateTrackerProgress(progress);
}
export function updateTrackerProgress(progress){const count=document.getElementById('trackerCompletedSets');if(count&&Number.isFinite(progress?.completedSets))count.textContent=String(progress.completedSets);}
