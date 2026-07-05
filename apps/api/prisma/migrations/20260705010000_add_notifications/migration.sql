-- CreateTable
CREATE TABLE `sending_account_type` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(60) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `channel` ENUM('EMAIL', 'SMS', 'PUSH') NOT NULL,
    `config_schema` JSON NOT NULL,
    `message_schema` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sending_account_type_key_key`(`key`),
    INDEX `sending_account_type_channel_idx`(`channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sending_account` (
    `id` CHAR(36) NOT NULL,
    `type_id` CHAR(36) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `config` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `sending_account_type_id_idx`(`type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_type` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `account_id` CHAR(36) NOT NULL,
    `content` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `message_type_key_key`(`key`),
    INDEX `message_type_account_id_idx`(`account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sending_account` ADD CONSTRAINT `sending_account_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `sending_account_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_type` ADD CONSTRAINT `message_type_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `sending_account`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

