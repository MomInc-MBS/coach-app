// Central coach names. Every coach has two distinct candidate names; each name is a workout pun on a
// recognisable celebrity, historical figure or fitness legend, with a sci-fi twist. Metadata per name:
// [name, person referenced, workout term, sci-fi term]; both terms must appear in the name.
// Track is the coach's primary mapped workout group (performance-catalog tracks).
export const EXCLUDED_COACH_IDS=Object.freeze(['roster/21-flyer--winged_humanoid_3d_model','roster/18-quad-all--wooden_robot_3d_model']);
const ROWS=[
['myr5','original',['MYR5 Rocky Rep-bot','Rocky Balboa','rep','bot'],['MYR5 Atlas Lift Prime','Charles Atlas','lift','prime']],
// shoulders / arms
['02-taper-tallstalk--humanoid_robot_3d_model1','arms',['Arm-nald Space-anegar','Arnold Schwarzenegger','arm','space'],['Lou Ferrig-Delt-no Nova','Lou Ferrigno','delt','nova']],
['19-genie-multi--multi-armed_humanoid_3d_model1','arms',['Dwayne Shoulder-Rock-et','Dwayne Johnson','shoulder','rocket'],['Ronnie Cole-Train Raise Cyborg','Ronnie Coleman','raise','cyborg']],
['19-genie-multi--multi-armed_humanoid_3d_model','arms',['Frank Zane Zero-G Press','Frank Zane','press','zerog'],['Jay Cutler Shrug-Droid','Jay Cutler','shrug','droid']],
['17-shellcap-manyarm--mushroom_creature_3d_model','arms',['Hulk Hoga-Overhead Orbit','Hulk Hogan','overhead','orbit'],['Chris Hemsworkout Starfarer','Chris Hemsworth','workout','starfarer']],
['17-shellcap-manyarm--mushroom_robot_3d_model','arms',['Kai Greene-Lateral Laser','Kai Greene','lateral','laser'],['Phil Heath-Reactor Press Plasma','Phil Heath','press','plasma']],
['23-blob-texture-bodies--patchwork_plush_figure_3d_model','arms',['Joe Weider Warp-Raise','Joe Weider','raise','warp'],['Serena Williams Serve-Press Solar','Serena Williams','press','solar']],
['08-shard-asym--robot_3d_model4','arms',['Eugen Sand-OW! Dumbbell Droid','Eugen Sandow','dumbbell','droid'],['Steve Reeve-Raise Hyperdrive','Steve Reeves','raise','hyperdrive']],
['17-shellcap-manyarm--3d_character_figurine','arms',['Zyzz Zero-Gravity Shrug','Zyzz','shrug','gravity'],['Flex Wheeler Flex-Wheel Cosmic','Flex Wheeler','flex','cosmic']],
// chest
['06-ridge-triad--geometric_robot_3d_model1','chest',['Sylvester Stall-Press-one Cosmo','Sylvester Stallone','press','cosmo'],['Vin Diesel Push-el Voyager','Vin Diesel','push','voyager']],
['08-shard-asym--geometric_robot_3d_model','chest',['Jason Stat-Ham Bench-Bot','Jason Statham','bench','bot'],['Mr. T-Push-Up Pulsar','Mr. T','pushup','pulsar']],
['16-spade-arch--pyramid_head_figure_3d_model','chest',['Franco Colum-Bench Starship','Franco Columbu','bench','starship'],['Cleo-Pec-tra Cyber','Cleopatra','pec','cyber']],
['04-crest-wedge--robot_creature_3d_model','chest',['Pec-asso Space Studio','Pablo Picasso','pec','space'],['Da Vinci Press-tige Quantum','Leonardo da Vinci','press','quantum']],
['16-spade-arch--stylized_humanoid_3d_model','chest',['Dolph Pec-gren Ion','Dolph Lundgren','pec','ion'],['Chuck Nor-ribs Push-Up Planet','Chuck Norris','pushup','planet']],
['04-crest-wedge--stylized_3d_character','chest',['Hugh Jackman Bench Mutant','Hugh Jackman','bench','mutant'],['Gal-actic Gadot Press','Gal Gadot','press','galactic']],
['09-monolith-tanka--3d_robot_model','chest',['Chris Pratt-Pushup Star-Lord','Chris Pratt','pushup','star'],['Terry Crews Pec-Crew Starship','Terry Crews','pec','starship']],
['09-monolith-tanka--white_horned_robot_3d_model','chest',['Mark Wahl-Bench Orbit','Mark Wahlberg','bench','orbit'],['Zac Effort Push Neutron','Zac Efron','push','neutron']],
// quads
['15-orbital-coili--robot_character_3d_model','quads',['Tom Platz Squat-Platz Orbiter','Tom Platz','squat','orbit'],['Squat-rick Swayze Spaceship','Patrick Swayze','squat','space']],
['13-fan-split--stylized_3d_character2','quads',['Cristiano Squat-aldo Rocket','Cristiano Ronaldo','squat','rocket'],['Lionel Lunge-ssi Galaxy','Lionel Messi','lunge','galaxy']],
['22-curve--stylized_cartoon_figure_3d_model','quads',['Frank Squat-ra Lunar','Frank Sinatra','squat','lunar'],['Elvis Pres-Squat Hoverbot','Elvis Presley','squat','bot']],
['02-taper-tallstalk--3d_humanoid_figure','quads',['Michael Jordan Leg-Day Space Jam','Michael Jordan','legday','space'],['Cyber Cher Squat','Cher','squat','cyber']],
['02-taper-tallstalk--white_humanoid_doll_3d_model','quads',['Julius Squat-sar Starship','Julius Caesar','squat','starship'],['Napoleon Lunge-aparte Laser','Napoleon Bonaparte','lunge','laser']],
['18-quad-all--wooden_four-legged_robot_3d_model','quads',['Genghis Squat-Khan Warp','Genghis Khan','squat','warp'],['Spartacus Leg-Press Rover','Spartacus','legpress','rover']],
['18-quad-all--stylized_quadruped_3d_model','quads',['Beyonce Squat-Beyond Galaxy','Beyonce','squat','galaxy'],['Shakira Lunge-Shakira Warp','Shakira','lunge','warp']],
// glutes / hips
['23-blob-texture-bodies--honeycomb_humanoid_3d_model','glutes',['Kim Glute-dashian Galaxy','Kim Kardashian','glute','galaxy'],['J-Lo Hip-Thrust Orbit','Jennifer Lopez','hipthrust','orbit']],
['23-blob-texture-bodies--sand_creature_3d_model','glutes',['Bret Contreras Thrust-Bot','Bret Contreras','thrust','bot'],['Nicki Minaj Bridge Jetpack','Nicki Minaj','bridge','jetpack']],
['03-pearl-orb-ring--stylized_3d_character1','glutes',['Marilyn Mon-row Hip-Hinge Satellite','Marilyn Monroe','hinge','satellite'],['Sir Glute-A-Lot Android','Sir Mix-A-Lot','glute','android']],
['03-pearl-orb-ring--stylized_humanoid_figure_3d_model','glutes',['Houdini Deadlift Cosmic Escape','Harry Houdini','deadlift','cosmic'],['Mae West Bridge Wormhole','Mae West','bridge','wormhole']],
['03-pearl-orb-ring--abstract_humanoid_3d_model','glutes',['Dolly Part-on-the-Hinge Droid','Dolly Parton','hinge','droid'],['Bridge-Miley Cyrus Cyber','Miley Cyrus','bridge','cyber']],
['03-pearl-orb-ring--circle_center','glutes',['Neil Arm-strong Hip-Thrust Moon','Neil Armstrong','thrust','moon'],['Glute-us Maximus Mech','Maximus of Rome','glute','mech']],
['23-blob-texture-bodies--cute_blob_creature_3d_model','glutes',['Tyra Bands Glute Planet','Tyra Banks','glute','planet'],['Venus Williams Hinge Orbit','Venus Williams','hinge','orbit']],
// yoga
['10-petal-wisp--fantasy_creature_3d_model4','yoga',['Bendy Buddha Supreme','Buddha','bend','supreme'],['Madon-Asana Orbit','Madonna','asana','orbit']],
['19-genie-multi--fantasy_creature_3d_model','yoga',['Gwyneth Pose-trow Photon','Gwyneth Paltrow','pose','photon'],['Sting Tree Pose Starman','Sting','treepose','starman']],
['10-petal-wisp--ghost_character_3d_model','yoga',['Gandhi Namaste Nebula','Mahatma Gandhi','namaste','nebula'],['Snoop Downward Dogg Nova','Snoop Dogg','downward','nova']],
['08-shard-asym--stylized_action_figure_3d_model','yoga',['Joan of Arc Warrior Laser','Joan of Arc','warrior','laser'],['Isaac Newton Tree Pose Gravity','Isaac Newton','treepose','gravity']],
['22-curve--stylized_alien_3d_model','yoga',['Katy Purry Cat-Cow Cosmic','Katy Perry','catcow','cosmic'],['Lady Gaga-Stretch Galaxy','Lady Gaga','stretch','galaxy']],
['10-petal-wisp--stylized_creature_3d_model','yoga',['Joseph Pilates Laser-Core','Joseph Pilates','core','laser'],['BKS Iyengar Lunar Stretch','B. K. S. Iyengar','stretch','lunar']],
['19-genie-multi--stylized_octopus_3d_model','yoga',['Ringo Starr Octo-Stretch Cyborg','Ringo Starr','stretch','cyborg'],['Benedict Cumber-Bend Portal','Benedict Cumberbatch','bend','portal']],
['01-seed-pearo--cute_alien_figure_3d_model','yoga',['Robin Williams Alien Namaste','Robin Williams','namaste','alien'],['David Bow-ie Pose Stardust','David Bowie','pose','stardust']],
['01-seed-pearo--white_3d_character_model','yoga',['Lean-ard Nimoy Mountain Pose Vulcan','Leonard Nimoy','mountainpose','vulcan'],['Grace Joints Stretch Zero-G','Grace Jones','stretch','zerog']],
// martial arts
['09-monolith-tanka--boxy_humanoid_3d_model','martial-arts',['Bruce L33 Kick','Bruce Lee','kick','l33'],['Jackie Chop-Chan Cosmos','Jackie Chan','chop','cosmos']],
['11-anvil-cask--clay-style_robot_3d_model','martial-arts',['Mike Tyson Punch-Out Mech','Mike Tyson','punchout','mech'],['Muhammad Ali-en Jab','Muhammad Ali','jab','alien']],
['05-slope-bobble--clay_humanoid_figure_3d_model','martial-arts',['Conor McGregor Spar-Gregor Ion','Conor McGregor','spar','ion'],['Floyd Mayweather Jab-Bot','Floyd Mayweather','jab','bot']],
['14-chisel-spire--cone_head_3d_model','martial-arts',['Van Damme Kick Quantum','Jean-Claude Van Damme','kick','quantum'],['Jet Li Kick Starfighter','Jet Li','kick','starfighter']],
['08-shard-asym--fantasy_creature_3d_model2','martial-arts',['Ronda Rousey Armbar Rover','Ronda Rousey','armbar','rover'],['Pat Morita Crane-Kick Plasma','Pat Morita','kick','plasma']],
['09-monolith-tanka--mini_robot_3d_model','martial-arts',['Sun Tzu Stance Starship','Sun Tzu','stance','starship'],['Miyamoto Musashi Stance Cyber','Miyamoto Musashi','stance','cyber']],
['09-monolith-tanka--robot_3d_model3','martial-arts',['Donnie Yen-Punch Warp','Donnie Yen','punch','warp'],['Steven Seagal Spar-Gal Android','Steven Seagal','spar','android']],
['13-fan-split--stylized_toy_3d_model','martial-arts',['Michelle Yeoh Kick Multiverse','Michelle Yeoh','kick','multiverse'],['Sugar Ray Laser Jab','Sugar Ray Leonard','jab','laser']],
['09-monolith-tanka--robot_3d_model2','martial-arts',['Joe Frazier Punch Mothership','Joe Frazier','punch','mothership'],['George Foreman Punch Grill-Bot','George Foreman','punch','bot']],
// cardio
['07-bulb-sphereling--humanoid_robot_3d_model','cardio',['Usain Bolt Sprint Hyperdrive','Usain Bolt','sprint','hyperdrive'],['Carl Lewis Lightspeed Sprint','Carl Lewis','sprint','lightspeed']],
['03-pearl-orb-ring--ringed_humanoid_3d_model','cardio',['Jane Fonda Cardio Cosmos','Jane Fonda','cardio','cosmos'],['Richard Sweat-mons Spacesuit','Richard Simmons','sweat','space']],
['06-ridge-triad--robot_3d_model1','cardio',['Roger Bannister Mile Warp','Roger Bannister','mile','warp'],['Pheidippides Marathon Mecha','Pheidippides','marathon','mecha']],
['03-pearl-orb-ring--robot_3d_model','cardio',['Eliud Kipchoge Marathon Rocket','Eliud Kipchoge','marathon','rocket'],['Mo Farah Far-Jog Cyborg','Mo Farah','jog','cyborg']],
['20-lume--robotic_figure_3d_model','cardio',['Flo-Jo Sprint Laser','Florence Griffith Joyner','sprint','laser'],['Jesse Owens Sprint Satellite','Jesse Owens','sprint','satellite']],
['07-bulb-sphereling--cute_robot_3d_model','cardio',['Steve Prefontaine Run Starship','Steve Prefontaine','run','starship'],['Paula Radcliffe Run Rover','Paula Radcliffe','run','rover']],
['01-seed-pearo--blank_toy_figure_3d_model','cardio',['Run-DMC Sprint Matrix','Run-DMC','sprint','matrix'],['Tom Cruise-Control Sprint Droid','Tom Cruise','sprint','droid']],
// meditation
['18-quad-all--dragon_creature_3d_model','meditation',['Deep-ak Breath Nebula','Deepak Chopra','breath','nebula'],['Om-prah Mantra Mothership','Oprah Winfrey','mantra','mothership']],
['18-quad-all--fantasy_creature_3d_model1','meditation',['Dalai Zen-Llama Starship','Dalai Lama','zen','starship'],['Eckhart Tolle Zen Void','Eckhart Tolle','zen','void']],
['18-quad-all--fantasy_creature_3d_model3','meditation',['Wim Hof Breath Cryopod','Wim Hof','breath','cryopod'],['Jon Kabat-Zinn Mindful Quantum','Jon Kabat-Zinn','mindful','quantum']],
['18-quad-all--four-legged_robot_3d_model','meditation',['Marcus Aurelius Zen Orbit','Marcus Aurelius','zen','orbit'],['Lao Tzu Zen Teleporter','Lao Tzu','zen','teleporter']],
['18-quad-all--quadruped_robot_3d_model1','meditation',['Thich Nhat Hanh Breath Warp','Thich Nhat Hanh','breath','warp'],['Morgan Freeman Mindful Galaxy','Morgan Freeman','mindful','galaxy']],
['18-quad-all--quadruped_robot_3d_model','meditation',['Keanu Reeves Breath Matrix','Keanu Reeves','breath','matrix'],['Andy Puddicombe Mindful Spaceship','Andy Puddicombe','mindful','space']],
['18-quad-all--robotic_dog_3d_model','meditation',['Bob Ross Happy Mantra Planet','Bob Ross','mantra','planet'],['Mr. Rogers Zen Hologram','Fred Rogers','zen','hologram']],
['12-seedpod-snailslug--stylized_slug_3d_model','meditation',['Sadhguru Mindful Moonbase','Sadhguru','mindful','moon'],['Maharishi Mantra Moonbase','Maharishi Mahesh Yogi','mantra','moon']],
['12-seedpod-snailslug--stylized_worm_3d_model','meditation',['Ram Dass Breath Cosmos','Ram Dass','breath','cosmos'],['Confucius Say Zen Droid','Confucius','zen','droid']],
['14-chisel-spire--low_poly_robot_3d_model','meditation',['Socrates Mantra Mech','Socrates','mantra','mech'],['Mother Teresa Breath Terraform','Mother Teresa','breath','terraform']],
['01-seed-pearo--3d_character_model','meditation',['Jack Kornfield Mindful Cosmos','Jack Kornfield','mindful','cosmos'],['Pema Chodron Zen Android','Pema Chodron','zen','android']],
['23-blob-texture-bodies--blob_creature_3d_model','meditation',['Blob 1 · Jack LaLanne Lotus Nova','Jack LaLanne','lotus','nova'],['Blob 1 · Steve Jobs Zen Hologram','Steve Jobs','zen','hologram']],
['01-seed-pearo--blank_humanoid_figure_3d_model','meditation',['Zen-daya Breath Pulsar','Zendaya','breath','pulsar'],['Nikola Tesla Mindful Plasma','Nikola Tesla','mindful','plasma']],
];
const META=Object.freeze(Object.fromEntries(ROWS.map(([path,track,a,b])=>[path==='myr5'?path:`roster/${path}`,Object.freeze({track,names:Object.freeze([a,b].map(([name,person,workout,scifi])=>Object.freeze({name,person,workout,scifi})))})])));
export const COACH_NAME_META=META;
/** [primary, alternative] by stable coach id. */
export const COACH_NAMES=Object.freeze(Object.fromEntries(Object.entries(META).map(([id,m])=>[id,Object.freeze(m.names.map(n=>n.name))])));
export const WORKOUT_TERMS=Object.freeze(['arm','delt','shoulder','raise','press','shrug','overhead','lateral','dumbbell','workout','flex','pec','push','pushup','bench','squat','lunge','legday','legpress','glute','hinge','bridge','thrust','hipthrust','deadlift','pose','treepose','mountainpose','asana','namaste','stretch','bend','core','catcow','downward','warrior','kick','punch','punchout','jab','spar','chop','stance','armbar','sprint','jog','cardio','mile','marathon','sweat','run','breath','mantra','zen','mindful','lotus','lift','rep']);
export const SCIFI_TERMS=Object.freeze(['space','star','nova','rocket','orbit','cyborg','droid','laser','plasma','warp','hyperdrive','quantum','ion','cosmo','cosmic','cosmos','galaxy','galactic','nebula','pulsar','alien','mech','mecha','bot','cyber','solar','lunar','moon','planet','rover','starship','starfighter','voyager','starfarer','gravity','zerog','photon','android','mutant','matrix','hologram','portal','multiverse','vulcan','void','neutron','satellite','wormhole','jetpack','lightspeed','stardust','starman','teleporter','terraform','cryopod','mothership','prime','supreme','l33']);
export const normalizePun=text=>String(text).toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'');
function metaFor(coachId){const meta=META[coachId];if(!meta)throw RangeError(`No coach name for ${coachId}.`);return meta;}
/** Primary name, or the alternative candidate. Unknown ids throw: there is no unnamed fallback. */
export const coachName=(coachId,alternative=false)=>metaFor(coachId).names[alternative?1:0].name;
/** The other candidate: pass the name currently shown to switch to its partner. */
export function cycleCoachName(coachId,current){const [first,second]=metaFor(coachId).names.map(n=>n.name);return current===first?second:first;}
