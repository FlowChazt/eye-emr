ALTER TABLE `medications` ADD `kind` text DEFAULT 'drug' NOT NULL;--> statement-breakpoint
ALTER TABLE `medications` ADD `auto_add_on_visit` integer DEFAULT false NOT NULL;