CREATE TABLE `coach_army_djscratch_challenges` (`id` text PRIMARY KEY NOT NULL, `run_id` text NOT NULL, `account_id` text NOT NULL, `expires_at` integer NOT NULL, `next_step` integer NOT NULL DEFAULT 0, `status` text NOT NULL DEFAULT 'active', `created_at` integer NOT NULL, `completed_at` integer, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `coach_army_djscratch_challenges_run` ON `coach_army_djscratch_challenges` (`run_id`, `account_id`, `status`);
