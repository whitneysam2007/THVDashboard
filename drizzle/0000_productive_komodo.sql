CREATE TABLE `donor_activities` (
	`id` varchar(36) NOT NULL,
	`donorId` varchar(36) NOT NULL,
	`date` varchar(10) NOT NULL,
	`author` varchar(128) NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `donor_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_donations` (
	`id` varchar(36) NOT NULL,
	`donorId` varchar(36) NOT NULL,
	`date` varchar(10) NOT NULL,
	`amountCents` int NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `donor_donations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donor_tasks` (
	`id` varchar(64) NOT NULL,
	`donorId` varchar(36) NOT NULL,
	`kind` varchar(16) NOT NULL DEFAULT 'onboarding',
	`label` varchar(255) NOT NULL,
	`dueDate` varchar(10) NOT NULL,
	`completedDate` varchar(10),
	`completedBy` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `donor_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donors` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL DEFAULT '',
	`email` varchar(320),
	`phone` varchar(64),
	`address` text,
	`startDate` varchar(10) NOT NULL,
	`type` varchar(32) NOT NULL DEFAULT 'one-time',
	`tier` varchar(32) NOT NULL DEFAULT 'individual',
	`contractEndDate` varchar(10),
	`recurringAmount` int,
	`recurringFrequency` varchar(16),
	`cadenceDays` int NOT NULL DEFAULT 90,
	`cadenceDescription` varchar(255) NOT NULL DEFAULT '',
	`lastContactDate` varchar(10),
	`status` varchar(16) NOT NULL DEFAULT 'grey',
	`naruCircle` int NOT NULL DEFAULT 0,
	`donorTrip` int NOT NULL DEFAULT 0,
	`taxReceiptSent` int NOT NULL DEFAULT 0,
	`newsletterSubscribed` int NOT NULL DEFAULT 0,
	`manuallyInactive` int NOT NULL DEFAULT 0,
	`referredBy` varchar(255),
	`nextAction` text,
	`dismissedTasks` text,
	`notes` text,
	`tags` text,
	`tripId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `donors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `initiatives` (
	`id` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`owner` varchar(128) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'not-started',
	`category` varchar(128) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `initiatives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trip_attendees` (
	`id` varchar(36) NOT NULL,
	`tripId` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(64),
	`skills` text NOT NULL DEFAULT ('[]'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_attendees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`teamMembers` text NOT NULL DEFAULT ('[]'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
