-- AlterTable
ALTER TABLE `brio_activity_session` MODIFY `source` ENUM('MANUAL', 'HEALTHKIT', 'GOOGLE_FIT', 'STRAVA', 'GARMIN', 'HEVY', 'HEALTH_CONNECT') NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE `brio_daily_health` MODIFY `source` ENUM('MANUAL', 'HEALTHKIT', 'GOOGLE_FIT', 'STRAVA', 'GARMIN', 'HEVY', 'HEALTH_CONNECT') NOT NULL DEFAULT 'GARMIN';

-- CreateTable
CREATE TABLE `brio_health_device` (
    `user_id` CHAR(36) NOT NULL,
    `source` ENUM('MANUAL', 'HEALTHKIT', 'GOOGLE_FIT', 'STRAVA', 'GARMIN', 'HEVY', 'HEALTH_CONNECT') NOT NULL,
    `last_sync_at` DATETIME(3) NULL,
    `last_sync_days` INTEGER NULL,
    `last_sync_workouts` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `brio_health_device` ADD CONSTRAINT `brio_health_device_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

