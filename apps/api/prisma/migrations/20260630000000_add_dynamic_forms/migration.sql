-- CreateTable form
CREATE TABLE `form` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `schema` JSON NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `form_status_idx`(`status`),
    INDEX `form_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable form_instance
CREATE TABLE `form_instance` (
    `id` CHAR(36) NOT NULL,
    `form_id` CHAR(36) NOT NULL,
    `hash` VARCHAR(64) NOT NULL,
    `response_policy` ENUM('SINGLE_PER_LINK', 'SINGLE_PER_USER', 'UNLIMITED') NOT NULL DEFAULT 'UNLIMITED',
    `requires_auth` BOOLEAN NOT NULL DEFAULT false,
    `opens_at` DATETIME(3) NULL,
    `closes_at` DATETIME(3) NULL,
    `max_responses` INTEGER NULL,
    `status` ENUM('ACTIVE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `form_instance_hash_key`(`hash`),
    INDEX `form_instance_form_id_idx`(`form_id`),
    INDEX `form_instance_hash_idx`(`hash`),
    INDEX `form_instance_status_closes_at_idx`(`status`, `closes_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable form_response
CREATE TABLE `form_response` (
    `id` CHAR(36) NOT NULL,
    `form_instance_id` CHAR(36) NOT NULL,
    `submitted_by_id` CHAR(36) NULL,
    `submitted_by_fingerprint` VARCHAR(128) NULL,
    `answers` JSON NOT NULL,
    `schema_snapshot` JSON NOT NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,

    INDEX `form_response_form_instance_id_submitted_at_idx`(`form_instance_id`, `submitted_at`),
    INDEX `form_response_submitted_by_id_idx`(`submitted_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `form_instance` ADD CONSTRAINT `form_instance_form_id_fkey` FOREIGN KEY (`form_id`) REFERENCES `form`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_response` ADD CONSTRAINT `form_response_form_instance_id_fkey` FOREIGN KEY (`form_instance_id`) REFERENCES `form_instance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
