CREATE TABLE `gala_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`creator` text NOT NULL,
	`started_at` integer NOT NULL,
	`dj_name` text,
	`moniker` text,
	`dj_at` integer,
	`gala_at` integer,
	`lil_at` integer,
	`corgi_at` integer,
	`hand_at` integer,
	`armie_at` integer,
	`completed_at` integer,
	`duration_ms` integer,
	`installed_at` integer,
	`joined_at` integer,
	`public_name` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gala_runs_public_name_unique` ON `gala_runs` (`public_name`);--> statement-breakpoint
CREATE INDEX `gala_runs_creator_started` ON `gala_runs` (`creator`,`started_at`);--> statement-breakpoint
CREATE INDEX `gala_runs_leaderboard` ON `gala_runs` (`joined_at`,`duration_ms`);