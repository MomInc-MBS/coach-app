CREATE TABLE `coach_army_runs` (`id` text PRIMARY KEY NOT NULL, `account_id` text NOT NULL, `started_at` integer NOT NULL, `completed_at` integer, `completion_event_id` text, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `coach_army_runs_account` ON `coach_army_runs` (`account_id`, `started_at`);
--> statement-breakpoint
CREATE TABLE `coach_army_run_events` (`event_id` text PRIMARY KEY NOT NULL, `run_id` text NOT NULL, `account_id` text NOT NULL, `sequence` integer NOT NULL, `stage` text NOT NULL, `source` text NOT NULL, `received_at` integer NOT NULL, UNIQUE(`run_id`, `sequence`));
--> statement-breakpoint
CREATE INDEX `coach_army_run_events_run` ON `coach_army_run_events` (`run_id`, `sequence`);
--> statement-breakpoint
CREATE TABLE `coach_army_completion_outbox` (`event_id` text PRIMARY KEY NOT NULL, `run_id` text NOT NULL, `account_id` text NOT NULL, `completed_at` integer NOT NULL, `status` text NOT NULL DEFAULT 'pending', `attempts` integer NOT NULL DEFAULT 0, `last_error` text, `delivered_at` integer, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `coach_army_completion_outbox_pending` ON `coach_army_completion_outbox` (`status`, `updated_at`);
