CREATE TABLE `onboarding` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`start_day` text NOT NULL,
	`completed_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`write_token` text NOT NULL
);
