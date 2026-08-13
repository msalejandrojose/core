-- CreateTable
CREATE TABLE `google_auth_session` (
    `id` CHAR(36) NOT NULL,
    `state` VARCHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'READY', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `access_token` TEXT NULL,
    `user_id` CHAR(36) NULL,
    `failure_reason` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `google_auth_session_state_key`(`state`),
    INDEX `google_auth_session_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
