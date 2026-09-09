ALTER TABLE `reminders` ADD `tone` text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE `reminders` ADD `days_per_week` integer DEFAULT 7 NOT NULL;