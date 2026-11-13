-- CreateTable
CREATE TABLE `ritmo_plan` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `race_date` DATE NULL,
    `race_distance_m` INTEGER NULL,
    `target_time_sec` INTEGER NULL,
    `notes` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ritmo_plan_user_id_is_active_idx`(`user_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_planned_session` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `plan_id` CHAR(36) NULL,
    `day` DATE NOT NULL,
    `kind` ENUM('STRENGTH', 'RUN', 'CYCLE', 'WALK', 'HIKE', 'SWIM', 'ELLIPTICAL', 'OTHER_CARDIO', 'OTHER') NOT NULL,
    `template_code` VARCHAR(40) NULL,
    `title` VARCHAR(120) NOT NULL,
    `load` ENUM('REST', 'LOW', 'MEDIUM', 'HIGH') NOT NULL,
    `start_time` VARCHAR(5) NULL,
    `planned_duration_min` SMALLINT NULL,
    `planned_distance_m` INTEGER NULL,
    `target_pace_sec_per_km` SMALLINT NULL,
    `structure` JSON NULL,
    `notes` VARCHAR(500) NULL,
    `completed_at` DATETIME(3) NULL,
    `completed_session_id` CHAR(36) NULL,
    `actual_notes` VARCHAR(500) NULL,
    `skipped` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ritmo_planned_session_plan_id_idx`(`plan_id`),
    INDEX `ritmo_planned_session_completed_session_id_idx`(`completed_session_id`),
    UNIQUE INDEX `ritmo_planned_session_user_id_day_key`(`user_id`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_plan` ADD CONSTRAINT `ritmo_plan_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_planned_session` ADD CONSTRAINT `ritmo_planned_session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_planned_session` ADD CONSTRAINT `ritmo_planned_session_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `ritmo_plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_planned_session` ADD CONSTRAINT `ritmo_planned_session_completed_session_id_fkey` FOREIGN KEY (`completed_session_id`) REFERENCES `ritmo_activity_session`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

