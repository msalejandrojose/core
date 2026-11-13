-- CreateTable
CREATE TABLE `ritmo_garmin_connection` (
    `user_id` CHAR(36) NOT NULL,
    `api_key_enc` TEXT NOT NULL,
    `last_sync_at` DATETIME(3) NULL,
    `last_sync_count` INTEGER NULL,
    `last_error` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_daily_health` (
    `user_id` CHAR(36) NOT NULL,
    `day` DATE NOT NULL,
    `resting_hr` SMALLINT NULL,
    `steps` INTEGER NULL,
    `sleep_sec` INTEGER NULL,
    `deep_sleep_sec` INTEGER NULL,
    `rem_sleep_sec` INTEGER NULL,
    `awake_sec` INTEGER NULL,
    `sleep_score` SMALLINT NULL,
    `hrv_ms` SMALLINT NULL,
    `stress_avg` SMALLINT NULL,
    `body_battery_max` SMALLINT NULL,
    `source` ENUM('MANUAL', 'HEALTHKIT', 'GOOGLE_FIT', 'STRAVA', 'GARMIN', 'HEVY') NOT NULL DEFAULT 'GARMIN',
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`, `day`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_garmin_connection` ADD CONSTRAINT `ritmo_garmin_connection_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_daily_health` ADD CONSTRAINT `ritmo_daily_health_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

