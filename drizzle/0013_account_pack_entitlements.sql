CREATE TABLE `account_pack_entitlements` (`user_id` text NOT NULL, `pack_id` text NOT NULL, `status` text NOT NULL, `granted_at` integer NOT NULL, PRIMARY KEY(`user_id`, `pack_id`));
--> statement-breakpoint
CREATE INDEX `account_pack_entitlements_user` ON `account_pack_entitlements` (`user_id`);
