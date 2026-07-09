-- CreateTable whatsapp_conversation
CREATE TABLE `whatsapp_conversation` (
    `id` CHAR(36) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `contact_phone` VARCHAR(32) NOT NULL,
    `contact_name` VARCHAR(160) NULL,
    `last_message_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_message_preview` VARCHAR(500) NULL,
    `last_direction` ENUM('INBOUND', 'OUTBOUND') NOT NULL DEFAULT 'INBOUND',
    `unread_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_conversation_account_id_contact_phone_key`(`account_id`, `contact_phone`),
    INDEX `whatsapp_conversation_account_id_last_message_at_idx`(`account_id`, `last_message_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable whatsapp_message
CREATE TABLE `whatsapp_message` (
    `id` CHAR(36) NOT NULL,
    `conversation_id` CHAR(36) NOT NULL,
    `direction` ENUM('INBOUND', 'OUTBOUND') NOT NULL,
    `wa_message_id` VARCHAR(255) NULL,
    `body` TEXT NOT NULL,
    `status` VARCHAR(40) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `whatsapp_message_wa_message_id_key`(`wa_message_id`),
    INDEX `whatsapp_message_conversation_id_timestamp_idx`(`conversation_id`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `whatsapp_message` ADD CONSTRAINT `whatsapp_message_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `whatsapp_conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
