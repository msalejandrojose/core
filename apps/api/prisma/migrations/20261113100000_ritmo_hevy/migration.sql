-- AlterTable
ALTER TABLE `ritmo_activity_session` MODIFY `source` ENUM('MANUAL', 'HEALTHKIT', 'GOOGLE_FIT', 'STRAVA', 'GARMIN', 'HEVY') NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE `ritmo_hevy_connection` (
    `user_id` CHAR(36) NOT NULL,
    `api_key_enc` TEXT NOT NULL,
    `username` VARCHAR(120) NULL,
    `last_sync_at` DATETIME(3) NULL,
    `last_sync_count` INTEGER NULL,
    `last_error` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_hevy_exercise_link` (
    `user_id` CHAR(36) NOT NULL,
    `template_id` VARCHAR(64) NOT NULL,
    `exercise_id` CHAR(36) NOT NULL,

    INDEX `ritmo_hevy_exercise_link_user_id_exercise_id_idx`(`user_id`, `exercise_id`),
    PRIMARY KEY (`user_id`, `template_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_hevy_connection` ADD CONSTRAINT `ritmo_hevy_connection_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_hevy_exercise_link` ADD CONSTRAINT `ritmo_hevy_exercise_link_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_hevy_exercise_link` ADD CONSTRAINT `ritmo_hevy_exercise_link_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `ritmo_exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

