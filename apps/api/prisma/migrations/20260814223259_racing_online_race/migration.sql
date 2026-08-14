-- CreateTable
CREATE TABLE `racing_online_race` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `track_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `racing_online_race_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_online_race_participant` (
    `id` CHAR(36) NOT NULL,
    `race_id` CHAR(36) NOT NULL,
    `role` ENUM('PLAYER', 'TARGET', 'THREAT') NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `duration_ms` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `delta_ms` INTEGER NOT NULL,

    UNIQUE INDEX `racing_online_race_participant_race_id_role_key`(`race_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `racing_online_race` ADD CONSTRAINT `racing_online_race_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_online_race` ADD CONSTRAINT `racing_online_race_track_id_fkey` FOREIGN KEY (`track_id`) REFERENCES `racing_track`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_online_race_participant` ADD CONSTRAINT `racing_online_race_participant_race_id_fkey` FOREIGN KEY (`race_id`) REFERENCES `racing_online_race`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_online_race_participant` ADD CONSTRAINT `racing_online_race_participant_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
