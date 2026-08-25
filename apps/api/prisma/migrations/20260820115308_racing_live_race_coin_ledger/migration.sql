-- AlterTable
ALTER TABLE `racing_coin_ledger_entry` ADD COLUMN `live_race_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `racing_coin_ledger_entry` ADD CONSTRAINT `racing_coin_ledger_entry_live_race_id_fkey` FOREIGN KEY (`live_race_id`) REFERENCES `racing_live_race`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
