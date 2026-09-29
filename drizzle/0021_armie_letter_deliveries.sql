CREATE TABLE `armie_letter_deliveries` (`user_id` text NOT NULL, `day` text NOT NULL, `letter_id` text NOT NULL, `sent_at` integer NOT NULL, PRIMARY KEY(`user_id`, `day`, `letter_id`));
