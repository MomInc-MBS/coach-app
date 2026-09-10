CREATE TABLE `breathing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE INDEX `breathing_user_started` ON `breathing_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `breathing_user_completed` ON `breathing_sessions` (`user_id`,`completed_at`);--> statement-breakpoint
CREATE TABLE `login_days` (
	`user_id` text NOT NULL,
	`day` integer NOT NULL,
	`logged_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `day`)
);
