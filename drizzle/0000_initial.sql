CREATE TABLE `user` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `email_verified` integer DEFAULT false NOT NULL,
  `image` text,
  `is_anonymous` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);
--> statement-breakpoint
CREATE TABLE `session` (
  `id` text PRIMARY KEY NOT NULL,
  `expires_at` integer NOT NULL,
  `token` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `ip_address` text,
  `user_agent` text,
  `user_id` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE TABLE `account` (
  `id` text PRIMARY KEY NOT NULL,
  `account_id` text NOT NULL,
  `provider_id` text NOT NULL,
  `user_id` text NOT NULL,
  `access_token` text,
  `refresh_token` text,
  `id_token` text,
  `access_token_expires_at` integer,
  `refresh_token_expires_at` integer,
  `scope` text,
  `password` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification` (
  `id` text PRIMARY KEY NOT NULL,
  `identifier` text NOT NULL,
  `value` text NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer,
  `updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `event` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `host_user_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`host_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_host_idx` ON `event` (`host_user_id`);
--> statement-breakpoint
CREATE TABLE `membership` (
  `event_id` text NOT NULL,
  `user_id` text NOT NULL,
  `role` text NOT NULL,
  `joined_at` integer NOT NULL,
  PRIMARY KEY(`event_id`, `user_id`),
  FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `membership_event_idx` ON `membership` (`event_id`);
--> statement-breakpoint
CREATE TABLE `schedule` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `name` text NOT NULL,
  `start_at` integer NOT NULL,
  `end_at` integer NOT NULL,
  `location_lat` real,
  `location_lng` real,
  `location_label` text,
  `memo` text,
  `status` text DEFAULT 'upcoming' NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_event_time_idx` ON `schedule` (`event_id`,`start_at`,`end_at`);
--> statement-breakpoint
CREATE INDEX `schedule_event_status_idx` ON `schedule` (`event_id`,`status`);
--> statement-breakpoint
CREATE TABLE `schedule_member` (
  `schedule_id` text NOT NULL,
  `user_id` text NOT NULL,
  `joined_at` integer NOT NULL,
  PRIMARY KEY(`schedule_id`, `user_id`),
  FOREIGN KEY (`schedule_id`) REFERENCES `schedule`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schedule_feature` (
  `id` text PRIMARY KEY NOT NULL,
  `schedule_id` text NOT NULL,
  `kind` text NOT NULL,
  `config` text NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`schedule_id`) REFERENCES `schedule`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_feature_schedule_idx` ON `schedule_feature` (`schedule_id`,`position`);
--> statement-breakpoint
CREATE TABLE `schedule_feature_state` (
  `feature_id` text NOT NULL,
  `user_id` text NOT NULL,
  `state` text NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY(`feature_id`, `user_id`),
  FOREIGN KEY (`feature_id`) REFERENCES `schedule_feature`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `announcement` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `author_user_id` text NOT NULL,
  `body` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `announcement_event_idx` ON `announcement` (`event_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `event_chat_message` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL,
  `author_user_id` text NOT NULL,
  `body` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_chat_event_idx` ON `event_chat_message` (`event_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `schedule_chat_message` (
  `id` text PRIMARY KEY NOT NULL,
  `schedule_id` text NOT NULL,
  `author_user_id` text NOT NULL,
  `body` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`schedule_id`) REFERENCES `schedule`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `schedule_chat_schedule_idx` ON `schedule_chat_message` (`schedule_id`,`created_at`);
