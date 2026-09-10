CREATE TABLE `account_identities` (
	`clerk_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_identities_owner_id_unique` ON `account_identities` (`owner_id`);