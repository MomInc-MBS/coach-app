CREATE TABLE `account_data_epochs` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`epoch` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "account_data_epochs_epoch" CHECK(typeof("account_data_epochs"."epoch") = 'integer' AND "account_data_epochs"."epoch" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "account_data_epochs_updated" CHECK(typeof("account_data_epochs"."updated_at") = 'integer' AND "account_data_epochs"."updated_at" >= 0)
);
--> statement-breakpoint
CREATE TABLE `account_data_deletions` (
	`owner_id` text NOT NULL,
	`deleted_epoch` integer NOT NULL,
	`deleted_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `deleted_epoch`),
	FOREIGN KEY (`owner_id`) REFERENCES `account_data_epochs`(`owner_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "account_data_deletions_epoch" CHECK(typeof("account_data_deletions"."deleted_epoch") = 'integer' AND "account_data_deletions"."deleted_epoch" BETWEEN 1 AND 9007199254740990),
	CONSTRAINT "account_data_deletions_time" CHECK(typeof("account_data_deletions"."deleted_at") = 'integer' AND "account_data_deletions"."deleted_at" >= 0)
);
