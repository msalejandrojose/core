-- CreateTable
CREATE TABLE `racing_wallet` (
    `user_id` CHAR(36) NOT NULL,
    `balance` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_coin_ledger_entry` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `amount` INTEGER NOT NULL,
    `source` ENUM('RACE_FIRST_PLACE', 'RACE_SECOND_PLACE', 'RACE_THIRD_PLACE', 'REWARDED_AD') NOT NULL,
    `online_race_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `racing_coin_ledger_entry_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `racing_wallet` ADD CONSTRAINT `racing_wallet_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_coin_ledger_entry` ADD CONSTRAINT `racing_coin_ledger_entry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `racing_wallet`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_coin_ledger_entry` ADD CONSTRAINT `racing_coin_ledger_entry_online_race_id_fkey` FOREIGN KEY (`online_race_id`) REFERENCES `racing_online_race`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
