CREATE TABLE `coach_army_completions` (`event_id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `completed_at` integer NOT NULL, `received_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `coach_army_completions_user` ON `coach_army_completions` (`user_id`);
--> statement-breakpoint
CREATE TABLE `account_entitlements` (`user_id` text PRIMARY KEY NOT NULL, `coach_army_status` text NOT NULL DEFAULT 'locked', `coach_army_completed_at` integer, `coach_army_event_id` text, `updated_at` integer NOT NULL);
