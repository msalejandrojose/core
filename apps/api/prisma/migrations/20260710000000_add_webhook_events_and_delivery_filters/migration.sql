-- AlterTable
ALTER TABLE `notification_delivery`
    ADD INDEX `notification_delivery_channel_idx`(`channel`),
    ADD INDEX `notification_delivery_created_at_idx`(`created_at`);

-- CreateTable
CREATE TABLE `webhook_event` (
    `id` CHAR(36) NOT NULL,
    `source` VARCHAR(60) NOT NULL,
    `type` VARCHAR(120) NULL,
    `payload` JSON NOT NULL,
    `signature_valid` BOOLEAN NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `result` VARCHAR(500) NULL,
    `error` TEXT NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `webhook_event_source_idx`(`source`),
    INDEX `webhook_event_status_idx`(`status`),
    INDEX `webhook_event_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
