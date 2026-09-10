CREATE TABLE `scoreboard_invites` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scoreboard_invites_token_hash_unique` ON `scoreboard_invites` (`token_hash`);--> statement-breakpoint
CREATE TABLE `scoreboard_links` (
	`id` text PRIMARY KEY NOT NULL,
	`user_a` text NOT NULL,
	`user_b` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scoreboard_links_a` ON `scoreboard_links` (`user_a`);--> statement-breakpoint
CREATE INDEX `scoreboard_links_b` ON `scoreboard_links` (`user_b`);--> statement-breakpoint
CREATE UNIQUE INDEX `scoreboard_links_pair` ON `scoreboard_links` (`user_a`,`user_b`);