-- CreateTable
CREATE TABLE `racing_grand_prix` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_grand_prix_slug_key`(`slug`),
    INDEX `racing_grand_prix_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_grand_prix_stage` (
    `id` CHAR(36) NOT NULL,
    `grand_prix_id` CHAR(36) NOT NULL,
    `track_id` CHAR(36) NOT NULL,
    `order` INTEGER NOT NULL,

    UNIQUE INDEX `racing_grand_prix_stage_grand_prix_id_order_key`(`grand_prix_id`, `order`),
    UNIQUE INDEX `racing_grand_prix_stage_grand_prix_id_track_id_key`(`grand_prix_id`, `track_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_grand_prix_attempt` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `grand_prix_id` CHAR(36) NOT NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'IN_PROGRESS',
    `total_duration_ms` INTEGER NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `racing_grand_prix_attempt_user_id_grand_prix_id_status_idx`(`user_id`, `grand_prix_id`, `status`),
    INDEX `racing_grand_prix_attempt_grand_prix_id_status_total_duratio_idx`(`grand_prix_id`, `status`, `total_duration_ms`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_grand_prix_stage_result` (
    `id` CHAR(36) NOT NULL,
    `attempt_id` CHAR(36) NOT NULL,
    `track_id` CHAR(36) NOT NULL,
    `duration_ms` INTEGER NOT NULL,
    `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `racing_grand_prix_stage_result_attempt_id_track_id_key`(`attempt_id`, `track_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `racing_grand_prix_stage` ADD CONSTRAINT `racing_grand_prix_stage_grand_prix_id_fkey` FOREIGN KEY (`grand_prix_id`) REFERENCES `racing_grand_prix`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_grand_prix_stage` ADD CONSTRAINT `racing_grand_prix_stage_track_id_fkey` FOREIGN KEY (`track_id`) REFERENCES `racing_track`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_grand_prix_attempt` ADD CONSTRAINT `racing_grand_prix_attempt_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_grand_prix_attempt` ADD CONSTRAINT `racing_grand_prix_attempt_grand_prix_id_fkey` FOREIGN KEY (`grand_prix_id`) REFERENCES `racing_grand_prix`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_grand_prix_stage_result` ADD CONSTRAINT `racing_grand_prix_stage_result_attempt_id_fkey` FOREIGN KEY (`attempt_id`) REFERENCES `racing_grand_prix_attempt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_grand_prix_stage_result` ADD CONSTRAINT `racing_grand_prix_stage_result_track_id_fkey` FOREIGN KEY (`track_id`) REFERENCES `racing_track`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
