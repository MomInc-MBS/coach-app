CREATE TABLE `goals` (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `title` text NOT NULL, `note` text NOT NULL DEFAULT '', `status` text NOT NULL DEFAULT 'active', `created_at` integer NOT NULL, `updated_at` integer NOT NULL);
--> statement-breakpoint
CREATE INDEX `goals_user_updated` ON `goals` (`user_id`,`updated_at`);
