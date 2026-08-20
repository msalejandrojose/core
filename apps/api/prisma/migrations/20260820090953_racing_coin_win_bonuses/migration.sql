-- AlterTable
ALTER TABLE `racing_coin_ledger_entry` ADD COLUMN `lap_time_id` CHAR(36) NULL,
    MODIFY `source` ENUM('RACE_FIRST_PLACE', 'RACE_SECOND_PLACE', 'RACE_THIRD_PLACE', 'REWARDED_AD', 'PERSONAL_BEST', 'BEAT_FRIEND', 'WIN_STREAK', 'PURCHASE_ARCHETYPE', 'PURCHASE_PART', 'PURCHASE_SKIN') NOT NULL;

-- AddForeignKey
ALTER TABLE `racing_coin_ledger_entry` ADD CONSTRAINT `racing_coin_ledger_entry_lap_time_id_fkey` FOREIGN KEY (`lap_time_id`) REFERENCES `racing_lap_time`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
