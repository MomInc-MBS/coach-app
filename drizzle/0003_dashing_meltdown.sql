CREATE TABLE `install_drafts` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`creator` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `install_drafts_expiry` ON `install_drafts` (`expires_at`);--> statement-breakpoint
CREATE INDEX `install_drafts_creator` ON `install_drafts` (`creator`);