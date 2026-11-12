-- AlterTable
ALTER TABLE `ritmo_activity_type` ADD COLUMN `kind` ENUM('STRENGTH', 'RUN', 'CYCLE', 'WALK', 'HIKE', 'SWIM', 'ELLIPTICAL', 'OTHER_CARDIO', 'OTHER') NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE `ritmo_activity_session` ADD COLUMN `cadence` INTEGER NULL,
    ADD COLUMN `elevation_gain_m` INTEGER NULL,
    ADD COLUMN `max_heart_rate` INTEGER NULL,
    ADD COLUMN `rpe` TINYINT NULL,
    ADD COLUMN `zone_seconds` JSON NULL;

-- CreateTable
CREATE TABLE `ritmo_exercise` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NULL,
    `name` VARCHAR(120) NOT NULL,
    `is_compound` BOOLEAN NOT NULL DEFAULT false,
    `is_bodyweight` BOOLEAN NOT NULL DEFAULT false,
    `owner_user_id` CHAR(36) NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ritmo_exercise_code_key`(`code`),
    INDEX `ritmo_exercise_owner_user_id_idx`(`owner_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_exercise_muscle` (
    `exercise_id` CHAR(36) NOT NULL,
    `muscle` ENUM('CHEST', 'LATS', 'TRAPS', 'FRONT_DELT', 'SIDE_DELT', 'REAR_DELT', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'ABS', 'LOWER_BACK') NOT NULL,
    `weight` DECIMAL(3, 2) NOT NULL,

    PRIMARY KEY (`exercise_id`, `muscle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_strength_set` (
    `id` CHAR(36) NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `exercise_id` CHAR(36) NOT NULL,
    `exercise_order` SMALLINT NOT NULL,
    `set_order` SMALLINT NOT NULL,
    `weight_kg` DECIMAL(6, 2) NOT NULL,
    `reps` SMALLINT NOT NULL,
    `rir` TINYINT NULL,
    `rest_sec` SMALLINT NULL,
    `is_warmup` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ritmo_strength_set_session_id_idx`(`session_id`),
    INDEX `ritmo_strength_set_user_id_exercise_id_idx`(`user_id`, `exercise_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_heart_config` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `max_hr` SMALLINT NULL,
    `resting_hr` SMALLINT NULL,
    `method` ENUM('MAX_HR', 'HR_RESERVE', 'CUSTOM') NOT NULL DEFAULT 'MAX_HR',
    `custom_zones` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ritmo_heart_config_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_performance_measurement` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `metric` ENUM('VO2MAX', 'LACTATE_THRESHOLD_PACE') NOT NULL,
    `value` DECIMAL(7, 2) NOT NULL,
    `heart_rate` SMALLINT NULL,
    `origin` ENUM('LAB_TEST', 'DEVICE', 'FIELD_TEST') NOT NULL,
    `source_label` VARCHAR(120) NULL,
    `measured_on` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ritmo_performance_measurement_user_id_metric_measured_on_idx`(`user_id`, `metric`, `measured_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_exercise` ADD CONSTRAINT `ritmo_exercise_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_exercise_muscle` ADD CONSTRAINT `ritmo_exercise_muscle_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `ritmo_exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_strength_set` ADD CONSTRAINT `ritmo_strength_set_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `ritmo_activity_session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_strength_set` ADD CONSTRAINT `ritmo_strength_set_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_strength_set` ADD CONSTRAINT `ritmo_strength_set_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `ritmo_exercise`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_heart_config` ADD CONSTRAINT `ritmo_heart_config_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_performance_measurement` ADD CONSTRAINT `ritmo_performance_measurement_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

