-- CreateTable
CREATE TABLE `racing_live_race` (
    `id` CHAR(36) NOT NULL,
    `track_id` CHAR(36) NOT NULL,
    `status` ENUM('FINISHED', 'ABANDONED') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NOT NULL,

    INDEX `racing_live_race_track_id_created_at_idx`(`track_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_live_race_participant` (
    `id` CHAR(36) NOT NULL,
    `race_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `duration_ms` INTEGER NULL,
    `position` INTEGER NULL,
    `delta_ms` INTEGER NULL,
    `disconnected` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `racing_live_race_participant_race_id_user_id_key`(`race_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `racing_live_race` ADD CONSTRAINT `racing_live_race_track_id_fkey` FOREIGN KEY (`track_id`) REFERENCES `racing_track`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_live_race_participant` ADD CONSTRAINT `racing_live_race_participant_race_id_fkey` FOREIGN KEY (`race_id`) REFERENCES `racing_live_race`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_live_race_participant` ADD CONSTRAINT `racing_live_race_participant_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
