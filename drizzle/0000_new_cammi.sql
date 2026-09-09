CREATE TABLE `deliveries` (
	`reminder_id` text NOT NULL,
	`day` text NOT NULL,
	`endpoint` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`reminder_id`, `day`, `endpoint`)
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`portion` text NOT NULL,
	`calories` real,
	`protein` real,
	`carbs` real,
	`fat` real,
	`eaten_at` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `meals_user_date` ON `meals` (`user_id`,`eaten_at`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`time` text NOT NULL,
	`timezone` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`quiet_start` text DEFAULT '22:00' NOT NULL,
	`quiet_end` text DEFAULT '07:00' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reminders_user` ON `reminders` (`user_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscriptions_user` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `system` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mode` text NOT NULL,
	`goal` real NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`value` real,
	`active` real
);
--> statement-breakpoint
CREATE INDEX `workouts_user_completed` ON `workouts` (`user_id`,`completed_at`);