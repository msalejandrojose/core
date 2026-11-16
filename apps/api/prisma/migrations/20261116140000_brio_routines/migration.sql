-- AlterTable
ALTER TABLE `brio_activity_session` ADD COLUMN `routine_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `brio_routine` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `kind` ENUM('STRENGTH', 'RUN', 'CYCLE', 'WALK', 'HIKE', 'SWIM', 'ELLIPTICAL', 'OTHER_CARDIO', 'OTHER') NOT NULL,
    `notes` VARCHAR(500) NULL,
    `planned_duration_min` SMALLINT NULL,
    `planned_distance_m` INTEGER NULL,
    `target_pace_sec_per_km` SMALLINT NULL,
    `hevy_routine_id` VARCHAR(64) NULL,
    `hevy_sent_at` DATETIME(3) NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `brio_routine_user_id_is_archived_idx`(`user_id`, `is_archived`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `brio_routine_exercise` (
    `id` CHAR(36) NOT NULL,
    `routine_id` CHAR(36) NOT NULL,
    `exercise_id` CHAR(36) NOT NULL,
    `position` SMALLINT NOT NULL,
    `sets` TINYINT NOT NULL,
    `reps` SMALLINT NOT NULL,
    `weight_kg` DECIMAL(6, 2) NULL,
    `rest_sec` SMALLINT NULL,

    INDEX `brio_routine_exercise_routine_id_position_idx`(`routine_id`, `position`),
    INDEX `brio_routine_exercise_exercise_id_idx`(`exercise_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `brio_activity_session_routine_id_idx` ON `brio_activity_session`(`routine_id`);

-- AddForeignKey
ALTER TABLE `brio_activity_session` ADD CONSTRAINT `brio_activity_session_routine_id_fkey` FOREIGN KEY (`routine_id`) REFERENCES `brio_routine`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_routine` ADD CONSTRAINT `brio_routine_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_routine_exercise` ADD CONSTRAINT `brio_routine_exercise_routine_id_fkey` FOREIGN KEY (`routine_id`) REFERENCES `brio_routine`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `brio_routine_exercise` ADD CONSTRAINT `brio_routine_exercise_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `brio_exercise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

