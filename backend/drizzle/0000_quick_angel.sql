CREATE TABLE `availability_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_user_id` text NOT NULL,
	`starts_at_utc` text NOT NULL,
	`ends_at_utc` text NOT NULL,
	`duration_min` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`coach_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_user_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollments_student_user_id_unique` ON `enrollments` (`student_user_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_user_id` text NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`availability_block_id` text NOT NULL,
	`student_user_id` text NOT NULL,
	`coach_user_id` text NOT NULL,
	`starts_at_utc` text NOT NULL,
	`ends_at_utc` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`cancelled_at` text,
	FOREIGN KEY (`availability_block_id`) REFERENCES `availability_blocks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`coach_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_confirmed_session_per_block` ON `sessions` (`availability_block_id`) WHERE "sessions"."status" = 'confirmed';--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`timezone` text NOT NULL,
	`created_at` text NOT NULL
);
