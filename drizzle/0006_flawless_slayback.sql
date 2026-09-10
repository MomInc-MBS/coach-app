CREATE TABLE `release_deliveries` (
	`user_id` text NOT NULL,
	`release_id` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `release_id`)
);
--> statement-breakpoint
CREATE TABLE `release_subscribers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`confirm_hash` text,
	`expires_at` integer,
	`unsubscribe_token` text NOT NULL,
	`updated_at` integer NOT NULL,
	`confirmed_at` integer,
	`last_release` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `release_subscribers_unsubscribe_token_unique` ON `release_subscribers` (`unsubscribe_token`);--> statement-breakpoint
CREATE INDEX `release_subscribers_confirmation` ON `release_subscribers` (`confirm_hash`);