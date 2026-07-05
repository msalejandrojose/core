-- CreateTable lead
CREATE TABLE `lead` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NULL,
    `email_normalized` VARCHAR(255) NULL,
    `phone` VARCHAR(40) NULL,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `company` VARCHAR(160) NULL,
    `status` ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST', 'UNQUALIFIED') NOT NULL DEFAULT 'NEW',
    `score` INTEGER NOT NULL DEFAULT 0,
    `owner_id` CHAR(36) NULL,
    `source` ENUM('WEB_FORM', 'MANUAL', 'IMPORT', 'API', 'REFERRAL', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `form_response_id` CHAR(36) NULL,
    `utm_source` VARCHAR(120) NULL,
    `utm_medium` VARCHAR(120) NULL,
    `utm_campaign` VARCHAR(120) NULL,
    `custom_fields` JSON NULL,
    `consent_given` BOOLEAN NOT NULL DEFAULT false,
    `consent_at` DATETIME(3) NULL,
    `converted_to_user_id` CHAR(36) NULL,
    `converted_at` DATETIME(3) NULL,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `lead_status_created_at_idx`(`status`, `created_at`),
    INDEX `lead_owner_id_status_idx`(`owner_id`, `status`),
    INDEX `lead_email_normalized_idx`(`email_normalized`),
    INDEX `lead_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable lead_activity
CREATE TABLE `lead_activity` (
    `id` CHAR(36) NOT NULL,
    `lead_id` CHAR(36) NOT NULL,
    `type` ENUM('NOTE', 'STATUS_CHANGE', 'ASSIGNMENT', 'SCORE_CHANGE', 'FORM_SUBMISSION', 'EMAIL', 'CALL', 'MEETING', 'CONVERSION', 'SYSTEM') NOT NULL,
    `body` TEXT NULL,
    `meta` JSON NULL,
    `actor_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `lead_activity_lead_id_created_at_idx`(`lead_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable lead_tag
CREATE TABLE `lead_tag` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `color` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `lead_tag_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable lead_tag_on_lead
CREATE TABLE `lead_tag_on_lead` (
    `lead_id` CHAR(36) NOT NULL,
    `tag_id` CHAR(36) NOT NULL,

    INDEX `lead_tag_on_lead_tag_id_idx`(`tag_id`),
    PRIMARY KEY (`lead_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `lead_activity` ADD CONSTRAINT `lead_activity_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_tag_on_lead` ADD CONSTRAINT `lead_tag_on_lead_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_tag_on_lead` ADD CONSTRAINT `lead_tag_on_lead_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `lead_tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
