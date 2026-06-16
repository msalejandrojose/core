-- CreateTable
CREATE TABLE `error_log` (
    `id` CHAR(36) NOT NULL,
    `error_id` CHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `level` ENUM('info', 'warn', 'error', 'critical') NOT NULL,
    `http_status` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `path` VARCHAR(255) NULL,
    `method` VARCHAR(10) NULL,
    `user_id` CHAR(36) NULL,
    `context` JSON NULL,
    `stack` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `error_log_error_id_key`(`error_id`),
    INDEX `error_log_code_idx`(`code`),
    INDEX `error_log_level_idx`(`level`),
    INDEX `error_log_created_at_idx`(`created_at`),
    INDEX `error_log_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
