-- AlterTable
ALTER TABLE `racing_car_archetype` ADD COLUMN `is_unlocked_by_default` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `racing_car_part` ADD COLUMN `is_unlocked_by_default` BOOLEAN NOT NULL DEFAULT true;
