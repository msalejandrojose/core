-- CreateTable
CREATE TABLE `notification_delivery` (
    `id` CHAR(36) NOT NULL,
    `message_type_id` CHAR(36) NULL,
    `message_type_key` VARCHAR(120) NOT NULL,
    `account_id` CHAR(36) NULL,
    `channel` ENUM('EMAIL', 'SMS', 'PUSH') NOT NULL,
    `provider` VARCHAR(60) NOT NULL,
    `to_address` VARCHAR(320) NOT NULL,
    `subject` VARCHAR(500) NULL,
    `status` VARCHAR(40) NOT NULL,
    `provider_message_id` VARCHAR(255) NULL,
    `error` TEXT NULL,
    `events` JSON NULL,
    `sent_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `last_event_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `notification_delivery_message_type_key_idx`(`message_type_key`),
    INDEX `notification_delivery_provider_message_id_idx`(`provider_message_id`),
    INDEX `notification_delivery_status_idx`(`status`),
    INDEX `notification_delivery_to_address_idx`(`to_address`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
