-- CreateTable
CREATE TABLE `racing_league_config` (
    `id` CHAR(36) NOT NULL,
    `key` ENUM('POINTS_FIRST_PLACE', 'POINTS_SECOND_PLACE', 'POINTS_THIRD_PLACE', 'TIER_SILVER_THRESHOLD', 'TIER_GOLD_THRESHOLD', 'TIER_PLATINUM_THRESHOLD', 'TIER_DIAMOND_THRESHOLD') NOT NULL,
    `value` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_league_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_league_standing` (
    `user_id` CHAR(36) NOT NULL,
    `season_id` CHAR(36) NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL DEFAULT 'BRONZE',
    `points` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `racing_league_standing_season_id_tier_points_idx`(`season_id`, `tier`, `points`),
    PRIMARY KEY (`user_id`, `season_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `racing_league_standing` ADD CONSTRAINT `racing_league_standing_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_league_standing` ADD CONSTRAINT `racing_league_standing_season_id_fkey` FOREIGN KEY (`season_id`) REFERENCES `racing_season`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
