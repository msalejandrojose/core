-- AlterTable
ALTER TABLE `racing_car_archetype` ADD COLUMN `price_coins` INTEGER NULL;

-- AlterTable
ALTER TABLE `racing_car_part` ADD COLUMN `price_coins` INTEGER NULL;

-- AlterTable
ALTER TABLE `racing_car_skin` ADD COLUMN `price_coins` INTEGER NULL;

-- AlterTable
ALTER TABLE `racing_coin_ledger_entry` ADD COLUMN `archetype_id` CHAR(36) NULL,
    ADD COLUMN `part_id` CHAR(36) NULL,
    ADD COLUMN `skin_id` CHAR(36) NULL,
    MODIFY `source` ENUM('RACE_FIRST_PLACE', 'RACE_SECOND_PLACE', 'RACE_THIRD_PLACE', 'REWARDED_AD', 'PURCHASE_ARCHETYPE', 'PURCHASE_PART', 'PURCHASE_SKIN') NOT NULL;

-- AddForeignKey
ALTER TABLE `racing_coin_ledger_entry` ADD CONSTRAINT `racing_coin_ledger_entry_archetype_id_fkey` FOREIGN KEY (`archetype_id`) REFERENCES `racing_car_archetype`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_coin_ledger_entry` ADD CONSTRAINT `racing_coin_ledger_entry_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `racing_car_part`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_coin_ledger_entry` ADD CONSTRAINT `racing_coin_ledger_entry_skin_id_fkey` FOREIGN KEY (`skin_id`) REFERENCES `racing_car_skin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
