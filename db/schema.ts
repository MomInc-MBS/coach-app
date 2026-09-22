import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,real,index,uniqueIndex,primaryKey,check} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{userId:text('user_id').primaryKey(),data:text('data').notNull().default('{}'),revision:integer('revision').notNull().default(0),updatedAt:integer('updated_at').notNull()});
export const workouts=sqliteTable('workouts',{
 id:text('id').primaryKey(),userId:text('user_id').notNull(),mode:text('mode').notNull(),goal:real('goal').notNull(),startedAt:integer('started_at').notNull(),completedAt:integer('completed_at'),value:real('value'),active:real('active'),
 source:text('source').notNull().default('server'),clientWorkoutId:text('client_workout_id'),competitiveStatus:text('competitive_status'),
},t=>[
 index('workouts_user_completed').on(t.userId,t.completedAt),
 uniqueIndex('ux_workouts_acct_cwid').on(t.userId,t.clientWorkoutId).where(sql`${t.clientWorkoutId} IS NOT NULL`),
 index('ix_workouts_authority').on(t.userId,t.source,t.completedAt),
 index('ix_workouts_rank').on(t.userId,t.competitiveStatus,t.mode,t.completedAt),
 check('workouts_source',sql`${t.source} IN ('server','guest_import')`),
 check('workouts_competitive_status',sql`${t.competitiveStatus} IS NULL OR ${t.competitiveStatus} IN ('accepted','pending','not_eligible')`),
]);
export const meals=sqliteTable('meals',{id:text('id').primaryKey(),userId:text('user_id').notNull(),name:text('name').notNull(),portion:text('portion').notNull(),calories:real('calories'),protein:real('protein'),carbs:real('carbs'),fat:real('fat'),micros:text('micros').notNull().default('{}'),nutritionSource:text('nutrition_source'),eatenAt:text('eaten_at').notNull(),createdAt:integer('created_at').notNull()},t=>[index('meals_user_date').on(t.userId,t.eatenAt)]);
export const reminders=sqliteTable('reminders',{id:text('id').primaryKey(),userId:text('user_id').notNull(),kind:text('kind').notNull(),time:text('time').notNull(),timezone:text('timezone').notNull(),enabled:integer('enabled').notNull().default(1),quietStart:text('quiet_start').notNull().default('22:00'),quietEnd:text('quiet_end').notNull().default('07:00'),tone:text('tone').notNull().default('direct'),daysPerWeek:integer('days_per_week').notNull().default(7)},t=>[index('reminders_user').on(t.userId)]);
export const subscriptions=sqliteTable('subscriptions',{endpoint:text('endpoint').primaryKey(),userId:text('user_id').notNull(),data:text('data').notNull(),createdAt:integer('created_at').notNull()},t=>[index('subscriptions_user').on(t.userId)]);
export const releasePushDeliveries=sqliteTable('release_push_deliveries',{endpoint:text('endpoint').notNull().references(()=>subscriptions.endpoint,{onDelete:'cascade'}),releaseId:text('release_id').notNull(),status:text('status').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.endpoint,t.releaseId]})]);
export const deliveries=sqliteTable('deliveries',{reminderId:text('reminder_id').notNull(),day:text('day').notNull(),endpoint:text('endpoint').notNull(),status:text('status').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.reminderId,t.day,t.endpoint]})]);
export const system=sqliteTable('system',{key:text('key').primaryKey(),value:text('value').notNull()});
export const loginDays=sqliteTable('login_days',{userId:text('user_id').notNull(),day:integer('day').notNull(),loggedAt:integer('logged_at').notNull()},t=>[primaryKey({columns:[t.userId,t.day]})]);
export const breathingSessions=sqliteTable('breathing_sessions',{id:text('id').primaryKey(),userId:text('user_id').notNull(),startedAt:integer('started_at').notNull(),completedAt:integer('completed_at')},t=>[index('breathing_user_started').on(t.userId,t.startedAt),index('breathing_user_completed').on(t.userId,t.completedAt)]);
export const scoreboardInvites=sqliteTable('scoreboard_invites',{ownerId:text('owner_id').primaryKey(),tokenHash:text('token_hash').notNull().unique(),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()});
export const scoreboardLinks=sqliteTable('scoreboard_links',{id:text('id').primaryKey(),userA:text('user_a').notNull(),userB:text('user_b').notNull(),createdAt:integer('created_at').notNull()},t=>[index('scoreboard_links_a').on(t.userA),index('scoreboard_links_b').on(t.userB),uniqueIndex('scoreboard_links_pair').on(t.userA,t.userB)]);
export const onboarding=sqliteTable('onboarding',{userId:text('user_id').primaryKey(),data:text('data').notNull(),startDay:text('start_day').notNull(),completedAt:integer('completed_at').notNull(),updatedAt:integer('updated_at').notNull(),revision:integer('revision').notNull().default(1),writeToken:text('write_token').notNull()});

export const installDrafts=sqliteTable('install_drafts',{tokenHash:text('token_hash').primaryKey(),data:text('data').notNull(),creator:text('creator').notNull(),expiresAt:integer('expires_at').notNull()},t=>[index('install_drafts_expiry').on(t.expiresAt),index('install_drafts_creator').on(t.creator)]);

export const accountIdentities=sqliteTable('account_identities',{clerkId:text('clerk_id').primaryKey(),ownerId:text('owner_id').notNull().unique(),createdAt:integer('created_at').notNull()});

export const releaseSubscribers=sqliteTable('release_subscribers',{userId:text('user_id').primaryKey(),email:text('email').notNull(),enabled:integer('enabled').notNull().default(0),confirmHash:text('confirm_hash'),expiresAt:integer('expires_at'),unsubscribeToken:text('unsubscribe_token').notNull().unique(),updatedAt:integer('updated_at').notNull(),confirmedAt:integer('confirmed_at'),lastRelease:text('last_release')},t=>[index('release_subscribers_confirmation').on(t.confirmHash)]);
export const releaseDeliveries=sqliteTable('release_deliveries',{userId:text('user_id').notNull(),releaseId:text('release_id').notNull(),status:text('status').notNull(),updatedAt:integer('updated_at').notNull()},t=>[primaryKey({columns:[t.userId,t.releaseId]})]);
export const galaRuns=sqliteTable('gala_runs',{id:text('id').primaryKey(),tokenHash:text('token_hash').notNull(),creator:text('creator').notNull(),startedAt:integer('started_at').notNull(),djName:text('dj_name'),moniker:text('moniker'),djAt:integer('dj_at'),galaAt:integer('gala_at'),lilAt:integer('lil_at'),corgiAt:integer('corgi_at'),handAt:integer('hand_at'),armieAt:integer('armie_at'),completedAt:integer('completed_at'),durationMs:integer('duration_ms'),installedAt:integer('installed_at'),joinedAt:integer('joined_at'),publicName:text('public_name').unique()},t=>[index('gala_runs_creator_started').on(t.creator,t.startedAt),index('gala_runs_leaderboard').on(t.joinedAt,t.durationMs)]);
export const coachArmyCompletions=sqliteTable('coach_army_completions',{dataEpoch:integer('data_epoch').notNull().default(1),eventId:text('event_id').primaryKey(),userId:text('user_id').notNull(),completedAt:integer('completed_at').notNull(),receivedAt:integer('received_at').notNull()},t=>[index('coach_army_completions_user').on(t.userId)]);
export const accountEntitlements=sqliteTable('account_entitlements',{dataEpoch:integer('data_epoch').notNull().default(1),userId:text('user_id').primaryKey(),coachArmyStatus:text('coach_army_status').notNull().default('locked'),coachArmyCompletedAt:integer('coach_army_completed_at'),coachArmyEventId:text('coach_army_event_id'),updatedAt:integer('updated_at').notNull()});
export const accountPackEntitlements=sqliteTable('account_pack_entitlements',{userId:text('user_id').notNull(),packId:text('pack_id').notNull(),status:text('status').notNull(),grantedAt:integer('granted_at').notNull()},t=>[primaryKey({columns:[t.userId,t.packId]}),index('account_pack_entitlements_user').on(t.userId)]);
export const coachArmyRuns=sqliteTable('coach_army_runs',{dataEpoch:integer('data_epoch').notNull().default(1),id:text('id').primaryKey(),accountId:text('account_id').notNull(),startedAt:integer('started_at').notNull(),completedAt:integer('completed_at'),completionEventId:text('completion_event_id'),updatedAt:integer('updated_at').notNull()},t=>[index('coach_army_runs_account').on(t.accountId,t.startedAt)]);
export const coachArmyRunEvents=sqliteTable('coach_army_run_events',{dataEpoch:integer('data_epoch').notNull().default(1),eventId:text('event_id').primaryKey(),runId:text('run_id').notNull(),accountId:text('account_id').notNull(),sequence:integer('sequence').notNull(),stage:text('stage').notNull(),source:text('source').notNull(),receivedAt:integer('received_at').notNull()},t=>[index('coach_army_run_events_run').on(t.runId,t.sequence),uniqueIndex('coach_army_run_sequence').on(t.runId,t.sequence)]);
export const coachArmyCompletionOutbox=sqliteTable('coach_army_completion_outbox',{dataEpoch:integer('data_epoch').notNull().default(1),eventId:text('event_id').primaryKey(),runId:text('run_id').notNull(),accountId:text('account_id').notNull(),completedAt:integer('completed_at').notNull(),status:text('status').notNull().default('pending'),attempts:integer('attempts').notNull().default(0),lastError:text('last_error'),deliveredAt:integer('delivered_at'),updatedAt:integer('updated_at').notNull()},t=>[index('coach_army_completion_outbox_pending').on(t.status,t.updatedAt)]);
export const coachArmyDjscratchChallenges=sqliteTable('coach_army_djscratch_challenges',{dataEpoch:integer('data_epoch').notNull().default(1),id:text('id').primaryKey(),runId:text('run_id').notNull(),accountId:text('account_id').notNull(),expiresAt:integer('expires_at').notNull(),nextStep:integer('next_step').notNull().default(0),status:text('status').notNull().default('active'),createdAt:integer('created_at').notNull(),completedAt:integer('completed_at'),updatedAt:integer('updated_at').notNull()},t=>[index('coach_army_djscratch_challenges_run').on(t.runId,t.accountId,t.status)]);
export const goals=sqliteTable('goals',{id:text('id').primaryKey(),userId:text('user_id').notNull(),title:text('title').notNull(),note:text('note').notNull().default(''),status:text('status').notNull().default('active'),createdAt:integer('created_at').notNull(),updatedAt:integer('updated_at').notNull()},t=>[index('goals_user_updated').on(t.userId,t.updatedAt)]);
export const warRoomArsenals=sqliteTable('war_room_arsenals',{userId:text('user_id').primaryKey(),loadout:text('loadout').notNull(),recipes:text('recipes').notNull().default('[]'),revision:integer('revision').notNull().default(0),updatedAt:integer('updated_at').notNull()});

// Retained account generation and deletion receipts fence delayed requests.
export const accountDataEpochs=sqliteTable('account_data_epochs',{
 ownerId:text('owner_id').primaryKey().notNull(),
 epoch:integer('epoch').notNull().default(1),
 updatedAt:integer('updated_at').notNull(),
},t=>[check('account_data_epochs_epoch',sql`typeof(${t.epoch}) = 'integer' AND ${t.epoch} BETWEEN 1 AND 9007199254740991`),check('account_data_epochs_updated',sql`typeof(${t.updatedAt}) = 'integer' AND ${t.updatedAt} >= 0`)]);
export const accountDataDeletions=sqliteTable('account_data_deletions',{
 ownerId:text('owner_id').notNull().references(()=>accountDataEpochs.ownerId),
 deletedEpoch:integer('deleted_epoch').notNull(),
 deletedAt:integer('deleted_at').notNull(),
},t=>[primaryKey({columns:[t.ownerId,t.deletedEpoch]}),check('account_data_deletions_epoch',sql`typeof(${t.deletedEpoch}) = 'integer' AND ${t.deletedEpoch} BETWEEN 1 AND 9007199254740990`),check('account_data_deletions_time',sql`typeof(${t.deletedAt}) = 'integer' AND ${t.deletedAt} >= 0`)]);

export const workoutImports=sqliteTable('workout_imports',{
 workoutId:text('workout_id').primaryKey().notNull().references(()=>workouts.id,{onDelete:'cascade'}),
 idempotencyKey:text('idempotency_key').notNull(),fingerprint:text('fingerprint').notNull(),digestVersion:integer('digest_version').notNull(),accountDataEpoch:integer('account_data_epoch').notNull(),createdAt:integer('created_at').notNull(),
},t=>[
 check('workout_imports_key',sql`length(${t.idempotencyKey})=64 AND ${t.idempotencyKey} NOT GLOB '*[^0-9a-f]*'`),
 check('workout_imports_fingerprint',sql`length(${t.fingerprint})=64 AND ${t.fingerprint} NOT GLOB '*[^0-9a-f]*'`),
 check('workout_imports_version',sql`typeof(${t.digestVersion})='integer' AND ${t.digestVersion} BETWEEN 1 AND 9007199254740991`),
 check('workout_imports_epoch',sql`typeof(${t.accountDataEpoch})='integer' AND ${t.accountDataEpoch} BETWEEN 1 AND 9007199254740991`),
 check('workout_imports_created',sql`typeof(${t.createdAt})='integer' AND ${t.createdAt} BETWEEN 0 AND 9007199254740991`),
]);
export const competitiveDecisions=sqliteTable('competitive_decisions',{
 workoutId:text('workout_id').notNull().references(()=>workouts.id,{onDelete:'cascade'}),seq:integer('seq').notNull(),status:text('status').notNull(),reason:text('reason').notNull(),createdAt:integer('created_at').notNull(),
},t=>[
 primaryKey({columns:[t.workoutId,t.seq]}),
 check('competitive_decisions_seq',sql`typeof(${t.seq})='integer' AND ${t.seq} BETWEEN 1 AND 9007199254740991`),
 check('competitive_decisions_status',sql`${t.status} IN ('accepted','pending','not_eligible')`),
 check('competitive_decisions_reason',sql`length(${t.reason}) BETWEEN 1 AND 128`),
 check('competitive_decisions_created',sql`typeof(${t.createdAt})='integer' AND ${t.createdAt} BETWEEN 0 AND 9007199254740991`),
]);

export const coachArmyBindings=sqliteTable('coach_army_bindings',{dataEpoch:integer('data_epoch').notNull().default(1),bindingId:text('binding_id').primaryKey().notNull(),runId:text('run_id').notNull(),accountId:text('account_id').notNull(),eventId:text('event_id').notNull().unique(),claimHash:text('claim_hash').notNull().unique(),completedAt:integer('completed_at').notNull(),expiresAt:integer('expires_at').notNull(),claimedAt:integer('claimed_at'),createdAt:integer('created_at').notNull()},t=>[index('coach_army_bindings_account').on(t.accountId,t.expiresAt)]);
