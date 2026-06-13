CREATE TABLE `appointments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`scheduled_from_visit_id` integer,
	`date` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`arrived_visit_id` integer,
	`created_by` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scheduled_from_visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`arrived_visit_id`) REFERENCES `visits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `appointments_date_idx` ON `appointments` (`date`);--> statement-breakpoint
CREATE INDEX `appointments_patient_idx` ON `appointments` (`patient_id`);