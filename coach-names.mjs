// Two candidate identities for every retained coach. The person is provenance, never the display name.
// Workout and tech describe the two ideas blended into each name; they are review notes, not suffix rules.
// Track is the coach's primary mapped workout group (performance-catalog tracks).
export const EXCLUDED_COACH_IDS=Object.freeze(['roster/21-flyer--winged_humanoid_3d_model','roster/18-quad-all--wooden_robot_3d_model']);
const ROWS=[
['myr5','original',['MYR5 Jacked LaLAN','Jack LaLanne','jacked strength','local area network'],['MYR5 AT-Lift Prime','Charles Atlas','lift','model designation']],
// shoulders / arms
['02-taper-tallstalk--humanoid_robot_3d_model1','arms',['Arnoid Press','Arnold Schwarzenegger','Arnold press','android'],['ScotTorque Curl','Larry Scott','curl','motor torque']],
['19-genie-multi--multi-armed_humanoid_3d_model1','arms',['Ferri-Delt L0U','Lou Ferrigno','delt','robot designation'],['Cole-MANifold Curl','Ronnie Coleman','curl','engine manifold']],
['19-genie-multi--multi-armed_humanoid_3d_model','arms',['Delt-Zane Coil','Frank Zane','delt','magnetic coil'],['Cutlerator Curl','Jay Cutler','curl','accelerator']],
['17-shellcap-manyarm--mushroom_creature_3d_model','arms',['KAI-nematic Raise','Kai Greene','raise','kinematic mechanism'],['Philament Press','Phil Heath','press','electrical filament']],
['17-shellcap-manyarm--mushroom_robot_3d_model','arms',['Wheel-er Servo-Shrug','Flex Wheeler','shrug','servo wheel'],['Fletch-ER Armature','C. T. Fletcher','arm','motor armature']],
['23-blob-texture-bodies--patchwork_plush_figure_3d_model','arms',['Sand-OHM Press','Eugen Sandow','press','electrical resistance'],['Ree-volts Raise','Steve Reeves','raise','voltage']],
['08-shard-asym--robot_3d_model4','arms',['BUM-stead Bicep.exe','Chris Bumstead','bicep','software executable'],['Oli-VArmature','Sergio Oliva','arm','motor armature']],
['17-shellcap-manyarm--3d_character_figurine','arms',['Yate-SYNC Press','Dorian Yates','press','synchronized motor'],['Delt-a Bailey','Dana Linn Bailey','delt','Delta designation']],
// chest
['06-ridge-triad--geometric_robot_3d_model1','chest',['Colum-Bench Exo','Franco Columbu','bench','exosuit'],['Oli-Vac Pec','Sergio Oliva','pec','vacuum drive']],
['08-shard-asym--geometric_robot_3d_model','chest',['Pec-n0ld Reactor','Arnold Schwarzenegger','pec','reactor'],['Pecole-MAN Coil','Ronnie Coleman','pec','magnetic coil']],
['16-spade-arch--pyramid_head_figure_3d_model','chest',['Pec-Zane Drive','Frank Zane','pec','motor drive'],['Y4TES Press-Yoke','Dorian Yates','press','powered yoke']],
['04-crest-wedge--robot_creature_3d_model','chest',['Ferri-Pec Reactor','Lou Ferrigno','pec','reactor'],['Wheeler Wheel-Bench','Flex Wheeler','bench','drive wheel']],
['16-spade-arch--stylized_humanoid_3d_model','chest',['Cutlerator Press','Jay Cutler','press','accelerator'],['Hane-Yoke Bench','Lee Haney','bench','powered yoke']],
['04-crest-wedge--stylized_3d_character','chest',['Gr33ne Grid-Press','Kai Greene','press','power grid designation'],['Sand-OW Pec-Servo','Eugen Sandow','pec','servo']],
['09-monolith-tanka--3d_robot_model','chest',['Ree-volts Bench','Steve Reeves','bench','voltage'],['BenchSTEAD Bot','Chris Bumstead','bench','robot']],
['09-monolith-tanka--white_horned_robot_3d_model','chest',['Bail-EY Bench','Dana Linn Bailey','bench','cybernetic eye'],['Cavalier-EX Chest','Jeff Cavaliere','chest','exercise model EX']],
// quads
['15-orbital-coili--robot_character_3d_model','quads',['Platzma Squat','Tom Platz','squat','plasma'],['Coil-MAN Lunge','Ronnie Coleman','lunge','motor coil']],
['13-fan-split--stylized_3d_character2','quads',['Quad-Cutler Circuit','Jay Cutler','quad','circuit'],['BumSTEADy Squat','Chris Bumstead','squat','steady-state control']],
['22-curve--stylized_cartoon_figure_3d_model','quads',['Gr33ne Lunge-Gear','Kai Greene','lunge','gear designation'],['Warr-ENgine Squat','Branch Warren','squat','engine']],
['02-taper-tallstalk--3d_humanoid_figure','quads',['Hane-Yoke Lunge','Lee Haney','lunge','powered yoke'],['Stern-on Squat','Erin Stern','squat','power-on switch']],
['02-taper-tallstalk--white_humanoid_doll_3d_model','quads',['Oli-Volt Lunge','Sergio Oliva','lunge','voltage'],['Y4TES Yoke-Squat','Dorian Yates','squat','robot designation']],
['18-quad-all--wooden_four-legged_robot_3d_model','quads',['Bail-EY Lunge','Dana Linn Bailey','lunge','cybernetic eye'],['Priest-on Squat','Lee Priest','squat','piston']],
['18-quad-all--stylized_quadruped_3d_model','quads',['Quadzilla Platz','Tom Platz','quads','kaiju creature'],['SternShift Squat','Erin Stern','squat','gear shift']],
// glutes / hips
['23-blob-texture-bodies--honeycomb_humanoid_3d_model','glutes',['Con-Thrust-Era','Bret Contreras','hip thrust','thruster'],['C0RE-sey Hip-Drive','Cassey Ho','hip and core','motor drive and model code']],
['23-blob-texture-bodies--sand_creature_3d_model','glutes',['Tingularity Thrust','Chloe Ting','hip thrust','singularity'],['Arz-on Bridge','Robin Arzon','bridge','power-on switch']],
['03-pearl-orb-ring--stylized_3d_character1','glutes',['Gyrvanium Glute-Drive','Caroline Girvan','glute','futuristic alloy'],['Jill-iON Hinge-Flex','Jillian Michaels','hip hinge','ion drive']],
['03-pearl-orb-ring--stylized_humanoid_figure_3d_model','glutes',['Trac-ION Hip-Thrust','Tracy Anderson','hip thrust','ion drive'],['Simmonics Bridge-Servo','Whitney Simmons','bridge','electronics servo']],
['03-pearl-orb-ring--abstract_humanoid_3d_model','glutes',['Robo-ertson Bridge','Heather Robertson','bridge','robot'],['Hearn-ess ExoHinge','Katy Hearn','hinge','exosuit harness']],
['03-pearl-orb-ring--circle_center','glutes',['Con-Terra Coil-Bridge','Bret Contreras','bridge','planetary coil'],['Cyb-Ho Holo-Bridge','Cassey Ho','bridge','cyborg hologram']],
['23-blob-texture-bodies--cute_blob_creature_3d_model','glutes',['Arz-on Glute-Drive','Robin Arzon','glute','power-on motor'],['Chlo-Turbo Thrust','Chloe Ting','thrust','turbine']],
// yoga and mobility
['10-petal-wisp--fantasy_creature_3d_model4','yoga',['Iyeng-Align Gyro','B. K. S. Iyengar','alignment','gyroscopic balance'],['Adriene A-Sana Mk II','Adriene Mishler','asana','model revision']],
['19-genie-multi--fantasy_creature_3d_model','yoga',['Mat-Gregor Matrix','Kino MacGregor','mat','simulation matrix'],['Stile-Cycle Stretch','Tara Stiles','stretch','pose cycle']],
['10-petal-wisp--ghost_character_3d_model','yoga',['Warri0r-ner Drive','Dylan Werner','warrior pose','motor designation'],['Bend-ig Bot','Kathryn Budig','bend','robot']],
['08-shard-asym--stylized_action_figure_3d_model','yoga',['Yee-lastic Flow','Rodney Yee','yoga flow','elastic mechanics'],['C0RNe Circuit','Seane Corn','core','circuit designation']],
['22-curve--stylized_alien_3d_model','yoga',['Rea-Align Servo','Shiva Rea','alignment','servo'],['Strom Stretch-Current','Max Strom','stretch','electric current']],
['10-petal-wisp--stylized_creature_3d_model','yoga',['Adri-ENgine Pose','Adriene Mishler','pose','engine'],['Iyeng-Arc Inversion','B. K. S. Iyengar','inversion','powered arc']],
['19-genie-multi--stylized_octopus_3d_model','yoga',['Stile-Servo Pose','Tara Stiles','pose','servo'],['Yee Gyro-Yoga','Rodney Yee','yoga','gyroscope']],
['01-seed-pearo--cute_alien_figure_3d_model','yoga',['Wern-Axis Flow','Dylan Werner','flow','robotic axis'],['Mat-Gregor Drive','Kino MacGregor','mat practice','motor drive']],
['01-seed-pearo--white_3d_character_model','yoga',['Budig-ital Balance','Kathryn Budig','balance','digital'],['Corn Kernel Cobra','Seane Corn','cobra pose','computing kernel']],
// martial arts
['09-monolith-tanka--boxy_humanoid_3d_model','martial-arts',['Bruce L33 Kick','Bruce Lee','kick','alphanumeric call sign'],['GSP Spar-Drive','Georges St-Pierre','spar','motor drive']],
['11-anvil-cask--clay-style_robot_3d_model','martial-arts',['Sil-VOLT Strike','Anderson Silva','strike','voltage'],['Rous-Bot Armbar','Ronda Rousey','armbar','robot']],
['05-slope-bobble--clay_humanoid_figure_3d_model','martial-arts',['McG-Gear Kick','Conor McGregor','kick','gear transmission'],['Nor-Rotor Punch','Chuck Norris','punch','rotor']],
['14-chisel-spire--cone_head_3d_model','martial-arts',['LiDAR Jett-Jab','Jet Li','jab','laser ranging'],['Jaa-Bot Jab','Tony Jaa','jab','robot']],
['08-shard-asym--fantasy_creature_3d_model2','martial-arts',['Waters0nic Kick','Michelle Waterson','kick','sonic drive'],['Nu-NEURAL Strike','Amanda Nunes','strike','neural implant']],
['09-monolith-tanka--mini_robot_3d_model','martial-arts',['Machi-Droid Chop','Lyoto Machida','chop','android'],['Rut-TORque Kick','Bas Rutten','kick','motor torque']],
['09-monolith-tanka--robot_3d_model3','martial-arts',['Ade-SYNC Strike','Israel Adesanya','strike','synchronization'],['Shev-Servo Sweep','Valentina Shevchenko','sweep','servo']],
['13-fan-split--stylized_toy_3d_model','martial-arts',['BlankSaber Kick','Billy Blanks','kick','energy saber'],['Wilsonic Kick','Don Wilson','kick','sonic drive']],
['09-monolith-tanka--robot_3d_model2','martial-arts',['Rous-Torque Throw','Ronda Rousey','throw','motor torque'],['Jackie Chain-Kick','Jackie Chan','kick','chain drive']],
// cardio and endurance
['07-bulb-sphereling--humanoid_robot_3d_model','cardio',['B0LT Sprint-Drive','Usain Bolt','sprint','electrical bolt drive'],['Kipcho-Gait Tachyon','Eliud Kipchoge','running gait','tachyon']],
['03-pearl-orb-ring--ringed_humanoid_3d_model','cardio',['Fon-Dynamo Footwork','Jane Fonda','footwork','dynamo'],['Simmonics Sweatstream','Richard Simmons','aerobic sweat','electronics stream']],
['06-ridge-triad--robot_3d_model1','cardio',['Farad Fastlane','Mo Farah','fast run','electric capacitance'],['Flo-Jet Sprint','Florence Griffith Joyner','sprint','jet propulsion']],
['03-pearl-orb-ring--robot_3d_model','cardio',['Feli-X Footdrive','Allyson Felix','footwork','X-model drive'],['Rad-Clutch Run','Paula Radcliffe','run','motor clutch']],
['20-lume--robotic_figure_3d_model','cardio',['Pre-Font-AI-ne Pace','Steve Prefontaine','pace','AI running model'],['Ohm-wens Run','Jesse Owens','run','electrical resistance']],
['07-bulb-sphereling--cute_robot_3d_model','cardio',['Blanx Bootwave','Billy Blanks','boot camp','waveform'],['GebreShell Runloop','Haile Gebrselassie','run','software shell loop']],
['01-seed-pearo--blank_toy_figure_3d_model','cardio',['Phelpeller Pulse','Michael Phelps','cardio pulse','propeller'],['Fon-Droid Footwork','Jane Fonda','footwork','android']],
// meditation, breathwork and mindful movement
['18-quad-all--dragon_creature_3d_model','meditation',['H0F-Lung','Wim Hof','breathing','oxygen-code lung'],['McKe-Om Breathware','Patrick McKeown','breath meditation','software']],
['18-quad-all--fantasy_creature_3d_model1','meditation',['Ohm-Strom Breath','Max Strom','breathing','electrical resistance'],['Yee-uro Zen','Rodney Yee','mindful movement','neural interface']],
['18-quad-all--fantasy_creature_3d_model3','meditation',['Pilat-OS Breath','Joseph Pilates','breathing','operating system'],['Rea-Spire Airlock','Shiva Rea','respiration','airlock']],
['18-quad-all--four-legged_robot_3d_model','meditation',['Stile-Standby Breath','Tara Stiles','breathing','computer standby'],['Adri-ENgine Air-Sana','Adriene Mishler','breath and asana','air engine']],
['18-quad-all--quadruped_robot_3d_model1','meditation',['Iyeng-Inhale Gyro','B. K. S. Iyengar','inhale','gyroscopic balance'],['Werner Wind0wn','Dylan Werner','wind-down practice','alphanumeric standby mode']],
['18-quad-all--quadruped_robot_3d_model','meditation',['Vertu-al Breath','Shona Vertue','breathing','virtual reality'],['Yee Holo-Om','Rodney Yee','mindful movement','hologram']],
['18-quad-all--robotic_dog_3d_model','meditation',['Corn Kernel Calm','Seane Corn','calm meditation','computing kernel'],['Budig-ital Breath','Kathryn Budig','breathing','digital']],
['12-seedpod-snailslug--stylized_slug_3d_model','meditation',['H0F Hold-Circuit','Wim Hof','breath hold','circuit and model code'],['Ohm-Strom Still','Max Strom','stillness','electrical resistance']],
['12-seedpod-snailslug--stylized_worm_3d_model','meditation',['Pilat-OS Calm-Circuit','Joseph Pilates','mindful breathing','operating system circuit'],['Iyeng-Align Airlock','B. K. S. Iyengar','alignment and breath','airlock']],
['14-chisel-spire--low_poly_robot_3d_model','meditation',['Rea-Spire Relay','Shiva Rea','respiration','air relay'],['Yee Breathware','Rodney Yee','yoga breath','software']],
['01-seed-pearo--3d_character_model','meditation',['McKe-O2 Nose-Cone','Patrick McKeown','nasal breathing','rocket nose cone'],['Vertu-al Vent','Shona Vertue','ventilation','virtual reality']],
['23-blob-texture-bodies--blob_creature_3d_model','meditation',['Blob 1 · H0F Hold-Drive','Wim Hof','breath hold','air drive and model code'],['Blob 1 · Adriene A-Sana Core','Adriene Mishler','breath and asana','core processing']],
['01-seed-pearo--blank_humanoid_figure_3d_model','meditation',['Corn Kernel Om','Seane Corn','meditation','computing kernel'],['Kino-Kinetic Breath','Kino MacGregor','breathing','kinematics']],
];
const META=Object.freeze(Object.fromEntries(ROWS.map(([path,track,a,b])=>[path==='myr5'?path:`roster/${path}`,Object.freeze({track,names:Object.freeze([a,b].map(([name,person,workout,scifi])=>Object.freeze({name,person,workout,scifi})))})])));
export const COACH_NAME_META=META;
/** [primary, alternative] by stable coach id. */
export const COACH_NAMES=Object.freeze(Object.fromEntries(Object.entries(META).map(([id,m])=>[id,Object.freeze(m.names.map(n=>n.name))])));
export const normalizePun=text=>String(text).toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'');
function metaFor(coachId){const meta=META[coachId];if(!meta)throw RangeError(`No coach name for ${coachId}.`);return meta;}
/** Primary name, or the alternative candidate. Unknown ids throw: there is no unnamed fallback. */
export const coachName=(coachId,alternative=false)=>metaFor(coachId).names[alternative?1:0].name;
/** The other candidate: pass the name currently shown to switch to its partner. */
export function cycleCoachName(coachId,current){const [first,second]=metaFor(coachId).names.map(n=>n.name);return current===first?second:first;}
