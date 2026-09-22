ALTER TABLE `account_entitlements` ADD `data_epoch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_army_completion_outbox` ADD `data_epoch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_army_completions` ADD `data_epoch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_army_djscratch_challenges` ADD `data_epoch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_army_run_events` ADD `data_epoch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_army_runs` ADD `data_epoch` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `coach_army_bindings` ADD `data_epoch` integer DEFAULT 1 NOT NULL;