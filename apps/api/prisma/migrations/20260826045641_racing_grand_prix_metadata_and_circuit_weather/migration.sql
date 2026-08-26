-- AlterTable
ALTER TABLE `racing_circuit` ADD COLUMN `weather` ENUM('SUNNY', 'CLOUDY', 'RAINY', 'SNOWY') NOT NULL DEFAULT 'SUNNY';

-- AlterTable
ALTER TABLE `racing_grand_prix` ADD COLUMN `credits_reward` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN `image_id` CHAR(36) NULL,
    ADD COLUMN `xp_reward` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `racing_grand_prix_stage` ADD COLUMN `laps` INTEGER NOT NULL DEFAULT 1;
