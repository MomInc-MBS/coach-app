CREATE TABLE `competitive_decisions` (
	`workout_id` text NOT NULL,
	`seq` integer NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`workout_id`, `seq`),
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "competitive_decisions_seq" CHECK(typeof("competitive_decisions"."seq")='integer' AND "competitive_decisions"."seq" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "competitive_decisions_status" CHECK("competitive_decisions"."status" IN ('accepted','pending','not_eligible')),
	CONSTRAINT "competitive_decisions_reason" CHECK(length("competitive_decisions"."reason") BETWEEN 1 AND 128),
	CONSTRAINT "competitive_decisions_created" CHECK(typeof("competitive_decisions"."created_at")='integer' AND "competitive_decisions"."created_at" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE `workout_imports` (
	`workout_id` text PRIMARY KEY NOT NULL,
	`idempotency_key` text NOT NULL,
	`fingerprint` text NOT NULL,
	`digest_version` integer NOT NULL,
	`account_data_epoch` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workout_imports_key" CHECK(length("workout_imports"."idempotency_key")=64 AND "workout_imports"."idempotency_key" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "workout_imports_fingerprint" CHECK(length("workout_imports"."fingerprint")=64 AND "workout_imports"."fingerprint" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "workout_imports_version" CHECK(typeof("workout_imports"."digest_version")='integer' AND "workout_imports"."digest_version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "workout_imports_epoch" CHECK(typeof("workout_imports"."account_data_epoch")='integer' AND "workout_imports"."account_data_epoch" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "workout_imports_created" CHECK(typeof("workout_imports"."created_at")='integer' AND "workout_imports"."created_at" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
ALTER TABLE workouts ADD COLUMN source TEXT NOT NULL DEFAULT 'server' CONSTRAINT workouts_source CHECK(source IN ('server','guest_import'));
--> statement-breakpoint
ALTER TABLE workouts ADD COLUMN client_workout_id TEXT;
--> statement-breakpoint
ALTER TABLE workouts ADD COLUMN competitive_status TEXT CONSTRAINT workouts_competitive_status CHECK(competitive_status IS NULL OR competitive_status IN ('accepted','pending','not_eligible'));
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_workouts_acct_cwid` ON `workouts` (`user_id`,`client_workout_id`) WHERE "workouts"."client_workout_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_workouts_authority` ON `workouts` (`user_id`,`source`,`completed_at`);--> statement-breakpoint
CREATE INDEX `ix_workouts_rank` ON `workouts` (`user_id`,`competitive_status`,`mode`,`completed_at`);
--> statement-breakpoint
CREATE TRIGGER workouts_status_insert_guard BEFORE INSERT ON workouts
WHEN NEW.competitive_status IS NOT NULL OR EXISTS(SELECT 1 FROM workouts WHERE id=NEW.id)
BEGIN SELECT RAISE(ABORT,'workout_insert_authority'); END;
--> statement-breakpoint
CREATE TRIGGER workouts_source_insert_guard BEFORE INSERT ON workouts
WHEN (NEW.source='server' AND NEW.client_workout_id IS NOT NULL)
 OR (NEW.source='guest_import' AND (NEW.client_workout_id IS NULL OR length(NEW.client_workout_id)=0 OR NEW.completed_at IS NULL))
BEGIN SELECT RAISE(ABORT,'workout_source_shape'); END;
--> statement-breakpoint
CREATE TRIGGER workouts_authority_immutable BEFORE UPDATE ON workouts
WHEN NEW.source IS NOT OLD.source OR NEW.client_workout_id IS NOT OLD.client_workout_id
 OR NEW.id IS NOT OLD.id OR NEW.user_id IS NOT OLD.user_id
BEGIN SELECT RAISE(ABORT,'workout_authority_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER workouts_completion_immutable BEFORE UPDATE ON workouts
WHEN OLD.completed_at IS NOT NULL AND (NEW.completed_at IS NOT OLD.completed_at OR NEW.mode IS NOT OLD.mode
 OR NEW.goal IS NOT OLD.goal OR NEW.started_at IS NOT OLD.started_at OR NEW.value IS NOT OLD.value OR NEW.active IS NOT OLD.active)
BEGIN SELECT RAISE(ABORT,'workout_completion_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER cd_no_update BEFORE UPDATE ON competitive_decisions
BEGIN SELECT RAISE(ABORT,'append_only'); END;
--> statement-breakpoint
CREATE TRIGGER cd_no_delete BEFORE DELETE ON competitive_decisions
WHEN EXISTS(SELECT 1 FROM workouts WHERE id=OLD.workout_id)
BEGIN SELECT RAISE(ABORT,'append_only'); END;
--> statement-breakpoint
CREATE TRIGGER cd_insert_guard BEFORE INSERT ON competitive_decisions
WHEN NOT EXISTS(SELECT 1 FROM workouts WHERE id=NEW.workout_id AND completed_at IS NOT NULL)
 OR NEW.seq != COALESCE((SELECT MAX(seq)+1 FROM competitive_decisions WHERE workout_id=NEW.workout_id),1)
 OR EXISTS(SELECT 1 FROM competitive_decisions WHERE workout_id=NEW.workout_id AND status='not_eligible')
 OR (EXISTS(SELECT 1 FROM workouts WHERE id=NEW.workout_id AND source='guest_import') AND NEW.status!='not_eligible')
BEGIN SELECT RAISE(ABORT,'invalid_competitive_decision'); END;
--> statement-breakpoint
CREATE TRIGGER w_status_guard BEFORE UPDATE OF competitive_status ON workouts
WHEN NEW.competitive_status IS NOT (SELECT status FROM competitive_decisions WHERE workout_id=NEW.id ORDER BY seq DESC LIMIT 1)
BEGIN SELECT RAISE(ABORT,'competitive_cache_guard'); END;
--> statement-breakpoint
CREATE TRIGGER cd_sync AFTER INSERT ON competitive_decisions
BEGIN UPDATE workouts SET competitive_status=NEW.status WHERE id=NEW.workout_id; END;
--> statement-breakpoint
CREATE TRIGGER workout_server_completed_insert AFTER INSERT ON workouts
WHEN NEW.source='server' AND NEW.completed_at IS NOT NULL
BEGIN INSERT INTO competitive_decisions(workout_id,seq,status,reason,created_at) VALUES(NEW.id,1,'pending','server_completion',NEW.completed_at); END;
--> statement-breakpoint
CREATE TRIGGER workout_server_completed_update AFTER UPDATE OF completed_at ON workouts
WHEN OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL AND NEW.source='server'
BEGIN INSERT INTO competitive_decisions(workout_id,seq,status,reason,created_at) VALUES(NEW.id,1,'pending','server_completion',NEW.completed_at); END;
--> statement-breakpoint
CREATE TRIGGER workout_guest_completed_insert AFTER INSERT ON workouts
WHEN NEW.source='guest_import'
BEGIN INSERT INTO competitive_decisions(workout_id,seq,status,reason,created_at) VALUES(NEW.id,1,'not_eligible','guest_import',NEW.completed_at); END;
--> statement-breakpoint
CREATE TRIGGER workout_imports_insert_guard BEFORE INSERT ON workout_imports
WHEN NOT EXISTS(SELECT 1 FROM workouts WHERE id=NEW.workout_id AND source='guest_import' AND completed_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM workout_imports WHERE workout_id=NEW.workout_id)
 OR NEW.account_data_epoch IS NOT COALESCE((SELECT e.epoch FROM account_data_epochs e JOIN workouts w ON w.user_id=e.owner_id WHERE w.id=NEW.workout_id),1)
BEGIN SELECT RAISE(ABORT,'invalid_workout_import'); END;
--> statement-breakpoint
CREATE TRIGGER workout_imports_no_update BEFORE UPDATE ON workout_imports
BEGIN SELECT RAISE(ABORT,'immutable_import'); END;
--> statement-breakpoint
CREATE TRIGGER workout_imports_no_delete BEFORE DELETE ON workout_imports
WHEN EXISTS(SELECT 1 FROM workouts WHERE id=OLD.workout_id)
BEGIN SELECT RAISE(ABORT,'immutable_import'); END;
--> statement-breakpoint
INSERT INTO competitive_decisions(workout_id,seq,status,reason,created_at)
SELECT w.id,1,'pending','legacy_server_completion',CASE WHEN typeof(w.completed_at)='integer' AND w.completed_at BETWEEN 0 AND 9007199254740991 THEN w.completed_at ELSE 0 END FROM workouts w
WHERE w.source='server' AND w.completed_at IS NOT NULL
AND NOT EXISTS(SELECT 1 FROM competitive_decisions d WHERE d.workout_id=w.id);
