-- AlterTable
ALTER TABLE `racing_lap_time` ADD COLUMN `season_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `racing_season` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `racing_season_starts_at_idx`(`starts_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `racing_lap_time_season_id_track_id_duration_ms_idx` ON `racing_lap_time`(`season_id`, `track_id`, `duration_ms`);

-- AddForeignKey
ALTER TABLE `racing_lap_time` ADD CONSTRAINT `racing_lap_time_season_id_fkey` FOREIGN KEY (`season_id`) REFERENCES `racing_season`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
