-- CreateTable
CREATE TABLE `racing_coin_reward_config` (
    `id` CHAR(36) NOT NULL,
    `key` ENUM('RACE_FIRST_PLACE', 'RACE_SECOND_PLACE', 'RACE_THIRD_PLACE', 'REWARDED_AD', 'PERSONAL_BEST', 'BEAT_FRIEND', 'WIN_STREAK_2', 'WIN_STREAK_3', 'WIN_STREAK_4_PLUS') NOT NULL,
    `amount` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_coin_reward_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
