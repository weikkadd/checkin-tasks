CREATE TABLE `checkin_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`serviceName` varchar(128) NOT NULL,
	`serviceUrl` text NOT NULL,
	`accountUsername` varchar(256) NOT NULL,
	`accountPassword` text NOT NULL,
	`checkinInterval` int NOT NULL,
	`lastCheckinTime` timestamp,
	`nextCheckinTime` timestamp,
	`status` enum('正常','即将到期','已过期','执行中') NOT NULL DEFAULT '正常',
	`executionScript` text,
	`isEnabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkin_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `execution_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`executionTime` timestamp NOT NULL DEFAULT (now()),
	`resultStatus` enum('成功','失败','跳过') NOT NULL,
	`errorMessage` text,
	`executionDuration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskId` int NOT NULL,
	`notificationType` enum('续期成功','续期失败','即将到期') NOT NULL,
	`message` text NOT NULL,
	`sentTime` timestamp NOT NULL DEFAULT (now()),
	`sentStatus` enum('已发送','发送失败') NOT NULL DEFAULT '已发送',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notification_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gotifyServerUrl` varchar(512),
	`gotifyToken` text,
	`notificationEnabled` int NOT NULL DEFAULT 1,
	`notifyOnSuccess` int NOT NULL DEFAULT 1,
	`notifyOnFailure` int NOT NULL DEFAULT 1,
	`notifyOnExpiringSoon` int NOT NULL DEFAULT 1,
	`expiringThresholdDays` int NOT NULL DEFAULT 3,
	`cronSchedule` varchar(128) NOT NULL DEFAULT '0 */6 * * *',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `checkin_tasks` ADD CONSTRAINT `checkin_tasks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `execution_logs` ADD CONSTRAINT `execution_logs_taskId_checkin_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `checkin_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_history` ADD CONSTRAINT `notification_history_taskId_checkin_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `checkin_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;