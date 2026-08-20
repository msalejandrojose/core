-- CreateTable
CREATE TABLE `racing_matchmaking_config` (
    `id` CHAR(36) NOT NULL,
    `key` ENUM('RATING_K_FACTOR', 'RATING_WINDOW_BASE_POINTS', 'BOT_FILL_TIMEOUT_MS') NOT NULL,
    `value` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_matchmaking_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
