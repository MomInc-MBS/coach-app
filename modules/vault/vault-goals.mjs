import {COACH_REQUIREMENTS} from '../../performance-catalog.mjs';
// Achievement Vault: the achievement table (hall order = array order, easy -> hard) and its tunable thresholds.
// Pure. Every test(v) / progress(v) is total: an empty or missing state never throws.
// v = vault-store's view of the world: {counters:{name:n}, time:{name:ms}, secrets:{board:ts}, snap:{...collection snapshot}}.
//  snap (taken by vault-store from the real stores): coachesHave/coachesNeed, catsHave:{track:n earned coaches},
//  texturedCoaches, coloursHave/coloursNeed, texturesHave/texturesNeed (distinct ids granted vs pool), bossSkins, vaultPacksOpened.
// Clues are cryptic CRT text (L10 writes the real copy; placeholders are 'clue:<id>'); the title is revealed on earn.
export const VAULT_GOALS=Object.freeze({
 grimMinutes:Object.freeze([5,30,120]),timeCapMinutesPerDay:20, // addTime caps grimoire time per local day
 share:Object.freeze([1,25]),armieRead:Object.freeze([5,100]),armieIgnored:Object.freeze([5,100]),
 libraryOpen:10,djSessions:10,foodScans:10,arcadeScore:30,galaSlots:8,breathModes:2,shapes:9,
});
// How a counter counts (bump): 'day' = +n at most once per local day (default), 'max' = best value seen,
// 'keyed' = distinct keys (one per Armie letter id, gala slot, breathing mode, portal shape).
export const COUNTER_MODES=Object.freeze({'arcade-score':'max','armie-ignored':'keyed','gala-slot':'keyed','breath-mode':'keyed','shape-opened':'keyed','library-open':'keyed'});
export const SECRET_BOARDS=Object.freeze(['pond','wood','ice','quilt','grass','jelly']);
export const COACH_CATEGORIES=Object.freeze({meditation:'Meditation',yoga:'Yoga',cardio:'Cardio',quads:'Quads',glutes:'Glutes',chest:'Chest',arms:'Arms','martial-arts':'Martial arts'});
const num=x=>Number.isFinite(x)?x:0;
const count=(v,c)=>num(v?.counters?.[c]);
const CLUES={
 'still-pond':"Mother says the big one only rises for hands that stay.",
 'fire-starter':"Rub the grain the wrong way. Apologise with one tap. Sweep up.",
 'shatter':"Knock ten times on the cold window. It was never load-bearing.",
 'fold-twice':"Make the bed like Mother taught you: up from the bottom, then across.",
 'little-way-home':"He is very small and very far from his car. Plant him a road.",
 'boiling-point':"Keep one finger in the pudding until the bones complain.",
 'grim-time-1':"Stare at the book long enough and it starts staring back.",
 'grim-time-2':"The book has learned your name. It is still reading.",
 'grim-time-3':"You have spent a working day in a book with no words.",
 'history-open':"Somewhere behind you is a ledger of every rep you lied about.",
 'scoreboard-link':"Shake hands with a number that isn't yours.",
 'door-open':"Spin the wheel. Not that one. The heavy one.",
 'hall-end':"Walk past every ghost until there is no one left to judge you.",
 'vault-pack-opened':"A box from the basement. Mother says don't shake it. Open it.",
 'ar-first':"Invite a coach into your living room. Apologise for the mess.",
 'reminder-set':"Ask Mother to nag you. She has been waiting for permission.",
 'reminder-kept':"Let the nagging live for seven sunrises.",
 'pond-fish-seen':"Ten times you sat still enough for the shadow to pass.",
 'armie-read-1':"Somebody in uniform wrote to you. Have the decency.",
 'armie-ignored-1':"Leave the soldiers on read. They will survive. Probably.",
 'armie-read-100':"A hundred envelopes from the front. You opened every one.",
 'armie-ignored-100':"A hundred envelopes in the bin. Command has noticed.",
 'dj-first':"Make the spinning man play something.",
 'dj-10':"Ten nights at the club where nobody dances but you.",
 'gala-first-part':"Change one thing about the little pixel person.",
 'gala-all-slots':"Try every coat in the tiny wardrobe. Every hat. Every blade.",
 'breath-all':"Inhale every way Mother knows how to inhale.",
 'library-10':"Thumb through the book of bodies. Ten pages.",
 'food-scan-10':"Hold ten dinners up to the pyramid for judgement.",
 'shapes-all':"Trace every door in the book. Even the rude ones.",
 'arcade-30':"Pilot the bathtub. Shoot rocks. Earn thirty reasons.",
 'share-1':"Tell one person outside the house about the house.",
 'share-25':"Twenty-five days of telling people. Mother is so proud.",
 'coach-meditation':"Earn someone who is very good at sitting.",
 'coach-yoga':"Earn someone who can lick their own elbow.",
 'coach-cardio':"Earn someone whose heart is always in a hurry.",
 'coach-quads':"Earn someone with thighs like a planning dispute.",
 'coach-glutes':"Earn someone who leads from behind.",
 'coach-chest':"Earn someone who pushes the floor away.",
 'coach-arms':"Earn someone who carries the groceries in one trip.",
 'coach-martial-arts':"Earn someone who bows before they hurt you.",
 'boss-skin-first':"Beat a boss so hard they come back in eight bits.",
 'texture-every-coach':"Dress every alien in something with a feel to it.",
 'all-colours':"Own every crayon in the box, even the ugly beige.",
 'all-six':"Six books, six secrets. The wood, the water, the glass, the quilt, the grass, the goo.",
 'all-coaches':"Collect the entire family. Mother will set extra places.",
 'unlocked-everything':"Everyone. Every coat. Every colour. Then come find me."
};
const goal=(id,tier,title,test,progress)=>Object.freeze({id,tier,title,clue:CLUES[id]||'clue:'+id,test:v=>{try{return !!test(v||{});}catch{return false;}},...(progress?{progress:v=>{try{const p=progress(v||{});return {have:Math.max(0,Math.min(p.need,num(p.have))),need:p.need};}catch{return {have:0,need:1};}}}:{})});
const counter=(id,tier,title,name,need)=>goal(id,tier,title,v=>count(v,name)>=need,v=>({have:count(v,name),need}));
const minutes=(id,tier,title,mins)=>goal(id,tier,title,v=>num(v.time?.['grim-time'])>=mins*60000,v=>({have:Math.floor(num(v.time?.['grim-time'])/60000),need:mins}));
const secret=(id,title,board)=>goal(id,'rare',title,v=>!!v.secrets?.[board]);
const ratio=(id,tier,title,have,need)=>goal(id,tier,title,v=>num(v.snap?.[need])>0&&num(v.snap?.[have])>=num(v.snap?.[need]),v=>({have:num(v.snap?.[have]),need:Math.max(1,num(v.snap?.[need]))}));
const G=VAULT_GOALS;
const all=v=>[['coachesHave','coachesNeed'],['texturedCoaches','coachesNeed'],['coloursHave','coloursNeed'],['texturesHave','texturesNeed']].every(([h,n])=>num(v.snap?.[n])>0&&num(v.snap?.[h])>=num(v.snap?.[n]));
export const GOALS=Object.freeze([
 counter('history-open','rare','Looked Back','history-open',1),
 counter('scoreboard-link','rare','Linked Up','scoreboard-link',1),
 counter('reminder-set','rare','Remembered','reminder-set',1),
 counter('ar-first','rare','Out in the World','ar-session',1),
 counter('dj-first','rare','First Request','dj-session',1),
 counter('share-1','rare','Spread the Word','share',G.share[0]),
 counter('gala-first-part','rare','New Look','gala-part',1),
 counter('door-open','rare','Door Opener','door-open',1),
 secret('still-pond','Still Waters','pond'),
 secret('shatter','Shatterproof No More','ice'),
 minutes('grim-time-1','rare','Grimoire Gazer',G.grimMinutes[0]),
 secret('fire-starter','Fire Starter','wood'),
 counter('armie-read-1','rare','Good Correspondent','armie-read',G.armieRead[0]),
 counter('breath-all','rare','Every Breath','breath-mode',G.breathModes),
 counter('library-10','rare','Movement Scholar','library-open',G.libraryOpen),
 counter('food-scan-10','rare','Plate Detective','food-scan',G.foodScans),
 counter('shapes-all','rare','Shape Collector','shape-opened',G.shapes),
 secret('fold-twice','Folded Twice','quilt'),
 counter('armie-ignored-1','rare','Left on Read','armie-ignored',G.armieIgnored[0]),
 counter('gala-all-slots','rare','Try Everything','gala-slot',G.galaSlots),
 secret('little-way-home','Little Way Home','grass'),
 counter('arcade-30','rare','Tub Pilot','arcade-score',G.arcadeScore),
 counter('dj-10','rare','Regular Request','dj-session',G.djSessions),
 counter('reminder-kept','rare','Kept It Up','reminder-kept',1),
 counter('pond-fish-seen','rare','Big Fish Believer','pond-fish',10),
 secret('boiling-point','Boiling Point','jelly'),
 goal('hall-end','rare','Down the Hall',v=>count(v,'hall-end')>=1),
 goal('vault-pack-opened','rare','Pack Rat',v=>num(v.snap?.vaultPacksOpened)>=1),
 minutes('grim-time-2','rare','Grimoire Regular',G.grimMinutes[1]),
 ...Object.entries(COACH_CATEGORIES).map(([track,label])=>goal('coach-'+track,'rare','First '+label+' Coach',v=>num(v.snap?.catsHave?.[track])>=1)),
 goal('boss-skin-first','rare','Pixel Perfect',v=>num(v.snap?.bossSkins)>=1),
 counter('share-25','rare','Town Crier','share',G.share[1]),
 counter('armie-read-100','rare','Pen Pal','armie-read',G.armieRead[1]),
 counter('armie-ignored-100','rare','Professional Ghost','armie-ignored',G.armieIgnored[1]),
 goal('all-six','legendary','Six Secrets',v=>SECRET_BOARDS.every(b=>!!v.secrets?.[b]),v=>({have:SECRET_BOARDS.filter(b=>v.secrets?.[b]).length,need:SECRET_BOARDS.length})),
 minutes('grim-time-3','legendary','Grimoire Devotee',G.grimMinutes[2]),
 ratio('all-coaches','legendary','Full Roster','coachesHave','coachesNeed'),
 ratio('texture-every-coach','legendary','Dressed to Impress','texturedCoaches','coachesNeed'),
 ratio('all-colours','legendary','Every Colour','coloursHave','coloursNeed'),
 goal('unlocked-everything','legendary','Unlocked Everything',all),
]);
export const goalById=id=>GOALS.find(g=>g.id===id);
/** Ids whose test passes in v and are not already earned (earned: {id:ts}). */
export const newlyEarned=(v,earned={})=>GOALS.filter(g=>!earned[g.id]&&g.test(v)).map(g=>g.id);
const RANK={easy:0,medium:1,hard:2,expert:3};
/** One statue coach per goal (hall order): the HIGHEST-level coaches (difficulty, then later in the catalog = later unlock), hardest goal gets the highest. -> [{goalId,coachId}] */
export function statueCoaches(goals=GOALS){
 const ranked=COACH_REQUIREMENTS.map((c,i)=>[c,i]).sort((a,b)=>(RANK[a[0].difficulty]??0)-(RANK[b[0].difficulty]??0)||a[1]-b[1]).map(([c])=>c.id);
 const top=ranked.slice(-goals.length);
 return goals.map((g,i)=>({goalId:g.id,coachId:top[i+top.length-goals.length]??top[i]}));
}
