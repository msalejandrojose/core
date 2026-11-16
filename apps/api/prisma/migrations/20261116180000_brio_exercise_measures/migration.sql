-- AlterTable
ALTER TABLE `brio_exercise` ADD COLUMN `measure` ENUM('REPS', 'DISTANCE', 'TIME', 'CALORIES') NOT NULL DEFAULT 'REPS';

-- AlterTable
ALTER TABLE `brio_strength_set` ADD COLUMN `calories` SMALLINT NULL,
    ADD COLUMN `distance_m` INTEGER NULL,
    ADD COLUMN `duration_sec` INTEGER NULL;

-- AlterTable
ALTER TABLE `brio_routine_exercise` ADD COLUMN `calories` SMALLINT NULL,
    ADD COLUMN `distance_m` INTEGER NULL,
    ADD COLUMN `duration_sec` SMALLINT NULL;

