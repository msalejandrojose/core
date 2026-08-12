/*
  Warnings:

  - The primary key for the `dashboard` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `dashboard_widget` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `dashboard_widget` DROP FOREIGN KEY `dashboard_widget_dashboard_id_fkey`;

-- AlterTable
ALTER TABLE `dashboard` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `dashboard_widget` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `dashboard_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `racing_track` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `sector_count` INTEGER NOT NULL,
    `min_plausible_ms` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_track_slug_key`(`slug`),
    INDEX `racing_track_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_lap_time` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `track_id` CHAR(36) NOT NULL,
    `duration_ms` INTEGER NOT NULL,
    `splits_ms` JSON NOT NULL,
    `client_version` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `racing_lap_time_track_id_duration_ms_idx`(`track_id`, `duration_ms`),
    INDEX `racing_lap_time_user_id_track_id_duration_ms_idx`(`user_id`, `track_id`, `duration_ms`),
    INDEX `racing_lap_time_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dashboard_widget` ADD CONSTRAINT `dashboard_widget_dashboard_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_lap_time` ADD CONSTRAINT `racing_lap_time_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_lap_time` ADD CONSTRAINT `racing_lap_time_track_id_fkey` FOREIGN KEY (`track_id`) REFERENCES `racing_track`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
