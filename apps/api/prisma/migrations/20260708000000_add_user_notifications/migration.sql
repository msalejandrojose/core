-- CreateTable user_notification
CREATE TABLE `user_notification` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `kind` VARCHAR(60) NOT NULL DEFAULT 'system',
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NULL,
    `data` JSON NULL,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_notification_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `user_notification_user_id_read_at_idx`(`user_id`, `read_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_notification` ADD CONSTRAINT `user_notification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
