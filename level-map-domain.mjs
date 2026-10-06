// Presentation rules only. XP thresholds and rewards stay owned by progression-rules and battle-pass.
export const CHAPTER_SIZE=10;
export const CHAPTER_COUNT=25;
const WORLDS=[
 ['The first signal','Faint moon'],['Dustwake','Broken satellites'],['Pale orbit','Ice rings'],['Ion garden','Blue aurora'],['Beacon belt','Twin moons'],
 ['Amber crossing','Gas halo'],['The outer reach','Meteor river'],['Violet frontier','Crystal world'],['Aster passage','Silver rings'],['Solar forge','Young star'],
 ['Helios rise','Gold corona'],['The wide expanse','Planet chain'],['Cinder sea','Ash world'],['Neon divide','Artificial orbit'],['The crimson arc','Red giant'],
 ['Eventide','Shadow planet'],['The iron constellation','Orbital foundry'],['Hyperion','Binary suns'],['Last daylight','Supergiant'],['The dark current','Gravity tide'],
 ['Blackglass gate','Mirror world'],['The fracture','Dimensional seam'],['Singularity rim','Accretion disc'],['Beyond the veil','Star rift'],['The final horizon','Cosmic dawn']
];
export function chapterForLevel(level){return Math.max(0,Math.min(CHAPTER_COUNT-1,Math.floor((level-1)/CHAPTER_SIZE)));}
export function chapterLevels(chapter,thresholds){
 const page=Math.max(0,Math.min(CHAPTER_COUNT-1,chapter));
 return thresholds.slice(page*CHAPTER_SIZE,(page+1)*CHAPTER_SIZE).map((xp,index)=>({level:page*CHAPTER_SIZE+index+1,xp,tier:(index+1)%10===0?'Legendary':(index+1)%5===0?'Rare':'Uncommon'}));
}
export function chapterWorld(chapter){const page=Math.max(0,Math.min(CHAPTER_COUNT-1,chapter));return {name:WORLDS[page][0],body:WORLDS[page][1],intensity:page/(CHAPTER_COUNT-1),page};}
export function chapterCoach(chapter,requirements){
 if(!requirements.length)return null;
 return requirements[Math.min(requirements.length-1,Math.round(chapter*(requirements.length-1)/(CHAPTER_COUNT-1)))];
}
