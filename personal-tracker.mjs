export function renderPersonalTracker(plate,profile,targets,exerciseNames,progress){
 if(!plate.dataset.mounted){
  plate.className='mom-tracker';plate.setAttribute('aria-labelledby','personalTrackerTitle');
  plate.innerHTML=`<details class="tracker-collapse"><summary class="tracker-brand"><img src="/pod/mom-inc-mark.png" alt=""><div><span>MOM INC.</span><h2 id="personalTrackerTitle">Personal tracker</h2></div><span class="tracker-summary-day">Day <strong data-tracker="day"></strong></span><span class="tracker-chevron" aria-hidden="true">⌄</span></summary>
   <div class="tracker-content"><div class="tracker-identity"><div class="tracker-member"><p data-tracker="name"></p></div></div>
   <div class="tracker-record"><p><strong id="trackerCompletedSets">0</strong> sets logged</p></div>
   <h3 class="tracker-target-title">Today’s targets</h3><dl class="tracker-targets">
    <div><dt>Reps / set</dt><dd><strong data-tracker="reps"></strong><span>reps</span></dd></div>
    <div><dt>Hold / set</dt><dd><strong data-tracker="hold"></strong><span>sec</span></dd></div>
    <div data-nutrition-target><dt>Protein</dt><dd><strong data-tracker="protein"></strong><span>g / day</span></dd></div>
    <div data-nutrition-target><dt>Water</dt><dd><strong data-tracker="water"></strong><span>oz / day</span></dd></div>
   </dl><div class="tracker-focus"><span class="tracker-label">Your program</span><p data-tracker="exercises"></p></div>
   <footer class="tracker-footer"><a href="/onboarding.html?edit=1">Settings ↗</a></footer></div></details>`;
  plate.dataset.mounted='true';
 }
 const values={name:profile.name,day:String(targets.day).padStart(2,'0'),reps:targets.reps,hold:targets.holdSeconds,protein:targets.proteinGrams,water:targets.waterOz,exercises:profile.exercises.map(k=>exerciseNames[k]||k).join(' · ')};
 for(const [key,value]of Object.entries(values))plate.querySelector(`[data-tracker="${key}"]`).textContent=value??'—';
 for(const tile of plate.querySelectorAll('[data-nutrition-target]'))tile.hidden=!targets.proteinGrams;
 updateTrackerProgress(progress);
}
export function updateTrackerProgress(progress){const count=document.getElementById('trackerCompletedSets');if(count&&Number.isFinite(progress?.completedSets))count.textContent=String(progress.completedSets);}
