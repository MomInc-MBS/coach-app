// User-facing rules come from the same constants as workout progression.
import {HOLD_RECOVERY_SECONDS,WORKOUT_REST_SECONDS,PREPARATION_REPS,SECOND_PREPARATION_TEMPO_SECONDS,SPRINT_ROUNDS,SPRINT_SECONDS,SPRINT_REST_SECONDS,COSMETIC_LEVEL_COUNT} from './progression-rules.mjs';
export const GUIDE=[
 ['train','Train','BUILD YOUR PERFORMANCE. EARN YOUR COACH.',[
  ['Holds',`Active holding earns XP in completed 15-second blocks. Pause or break the pose to recover for ${HOLD_RECOVERY_SECONDS} seconds. Rest earns no exercise XP. A break resets the uninterrupted attempt; earned XP stays. Hold 5 uninterrupted minutes to unlock the coach at that difficulty, and 10 uninterrupted minutes for gold. Change difficulty to start a new uninterrupted attempt.`],
  ['Working sets',`Follow the easy ${PREPARATION_REPS}-rep preparation set, rest ${WORKOUT_REST_SECONDS} seconds, then do ${PREPARATION_REPS} harder preparation reps at ${SECOND_PREPARATION_TEMPO_SECONDS} seconds per full rep. Rest ${WORKOUT_REST_SECONDS} seconds before the working set. Only the working set earns XP and appears in history. Aim for a controlled challenging set; finish when you need to stop. 8 and 12 reps unlock weapon milestones; 15 reps unlock the coach. XP stops after 30 reps.`],
  ['Recovery','One rep working set per muscle group per day. Holds and reps may train the same group on the same day. After two consecutive days training a muscle group, take a day off that group while its boss recovers.'],
  ['Cardio',`Warm up before sprinting. Complete ${SPRINT_ROUNDS} rounds of ${SPRINT_SECONDS}-second sprints and ${SPRINT_REST_SECONDS}-second rests. Gentle cardio earns slower XP. Five sprint rounds or five active minutes of gentle cardio unlock the matching difficulty’s cardio coach.`],
  ['Choose your level','Exercises show Easy, Medium, Hard or Expert. You can select any level; rewards reflect what you perform. Inspect Achievements for each real coach, weapon family and ship requirement.']]],
 ['weapons','Weapons','TEN GROUPS. TWENTY WEAPONS.',[
  ['Difficulty blocks','Every weapon has 20 earned tiers: Easy 1–5, Medium 6–10, Hard 11–15 and Expert 16–20. Higher difficulty performance can jump directly into its block.'],
  ['Holds','Hold 1 uninterrupted minute for the first tier in the block, 3 minutes for the second and 5 minutes for a coach clear. Repeat a 5-minute clear to add another tier. A 10-minute uninterrupted hold completes that block and earns the golden coach.'],
  ['Reps','Complete 8 reps for the first tier in the difficulty block, 12 for the second and 15 for a coach clear. Repeat the working-set clear on another eligible day to add a tier.'],
  ['Ships','Complete Expert performance in the ship’s specified group and exercise type: 5 uninterrupted hold minutes or 15 working reps. Exact requirements appear under Achievements → Ships.']]],
 ['rewards','XP & packs','250 COSMETIC LEVELS.',[
  ['Cosmetic progression',`Workout XP advances ${COSMETIC_LEVEL_COUNT} levels of packs, colors, palettes, textures and finishes. Exercise performance unlocks coaches, weapons and ships. Each earned coach adds 25% to workout XP; those bonuses add together.`],
  ['Meditation','Complete meditation to double all workout XP earned that local day, including XP earned before the meditation session. Workout + meditation + food grants a separate 500 XP once that day. The 500 XP bonus is not doubled.'],
  ['Rest victories','Defeat the first boss during rest timers each local day to earn one uncommon pack. Defeat five that day to earn one legendary pack as well. Each reward is granted once per day. Rest defeats do not unlock coaches.'],
  ['Coach characters','Every coach unlocks its matching 64-bit character at the same time. Customize its colors in the War Room mirror. Coach characters do not wear clothing.']]],
 ['combat','Damage','YOUR STREAK IS YOUR POWER.',[
  ['Every hit','10 × consecutive login days × weapon damage level. Starter damage level is 1; earned weapon tiers reach 20, giving damage level 21.'],
  ['Daily damage boost','Finish the full breathing session for ×100 damage that combat day. Five login days with damage level 3 gives 150 damage, or 15,000 with breathing. Combat streaks and this damage boost use UTC days. Cosmetic daily XP uses local days.'],
  ['Specials','Earn specials at tiers 4, 8, 12, 16 and 20. One shared cooldown prevents switching weapons to skip the wait. Team strikes change the animation; the damage formula stays the same.']]],
 ['breathing','Meditation','THREE MINUTES. DAILY XP DOUBLED.',[
  ['Start in the still room','Open Meditation and start the three-minute session. Follow a comfortable breathing pace.'],
  ['Finish the session','Paused time, closed rooms and hidden tabs do not count. Completion doubles today’s workout XP once; repeating meditation does not stack the multiplier. Meditation coaches unlock after 3, 6, 9 and 12 separate completed days.']]],
 ['rooms','Side rooms','OFF DUTY. STILL IN THE POD.',[
  ['Rest arena','After the timer reaches zero, three seconds without a tap ends rest. Keep tapping to stay. Rest attacks earn no workout XP, but the first and fifth boss defeats of the day earn cosmetic packs.'],
  ['Helping Hand','Customize your hand from your avatar. Every third hand-assisted hit triggers a team strike.'],
  ['Meditation arcade','Keep tapping the meditating character to discover Tub Flight. Its minigame rewards do not replace a meditation session.'],
  ['Gala & War Room','Your verified account keeps performance ownership in sync. War Room access still requires the completed Gala run and app installation.']]],
 ['reminders','Reminders','MOM WILL FOLLOW UP.',[
  ['Choose the pressure','Set one, two or three messages per day. Missed scheduled training days make the next message firmer. Gentle tone, pause, frequency and quiet hours remain under your control.'],
  ['Connect this device','Allow notifications on each device. On iPhone, add Coach to your home screen first. The live sender works while Coach is closed; local previews do not send notifications.'],
  ['App updates','Updates download while connected and install when the app is idle. Older installs may need Update now once. A What’s new notice appears after releases.']]]
];
