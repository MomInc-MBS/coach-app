CREATE TABLE `coach_army_bindings` (`binding_id` text PRIMARY KEY NOT NULL, `run_id` text NOT NULL, `account_id` text NOT NULL, `event_id` text NOT NULL UNIQUE, `claim_hash` text NOT NULL UNIQUE, `completed_at` integer NOT NULL, `expires_at` integer NOT NULL, `claimed_at` integer, `created_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `coach_army_bindings_account` ON `coach_army_bindings` (`account_id`, `expires_at`);
