CREATE TABLE `release_push_deliveries` (
	`endpoint` text NOT NULL,
	`release_id` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`endpoint`, `release_id`),
	FOREIGN KEY (`endpoint`) REFERENCES `subscriptions`(`endpoint`) ON UPDATE no action ON DELETE cascade
);
