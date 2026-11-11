-- CreateTable
CREATE TABLE `nutre_profile` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `sex` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `birth_date` DATE NULL,
    `height_cm` DECIMAL(5, 1) NULL,
    `activity_level` ENUM('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE') NOT NULL DEFAULT 'MODERATE',
    `goal_type` ENUM('LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE') NOT NULL DEFAULT 'MAINTAIN',
    `target_weight_kg` DECIMAL(5, 2) NULL,
    `weekly_weight_change_kg` DECIMAL(4, 2) NULL,
    `bmr_kcal` INTEGER NULL,
    `tdee_kcal` INTEGER NULL,
    `daily_kcal_target` INTEGER NULL,
    `protein_target_g` INTEGER NULL,
    `carbs_target_g` INTEGER NULL,
    `fat_target_g` INTEGER NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Europe/Madrid',
    `onboarded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nutre_profile_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutre_body_measurement` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `measured_on` DATE NOT NULL,
    `weight_kg` DECIMAL(5, 2) NOT NULL,
    `body_fat_pct` DECIMAL(4, 1) NULL,
    `waist_cm` DECIMAL(5, 1) NULL,
    `notes` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nutre_body_measurement_user_id_measured_on_idx`(`user_id`, `measured_on`),
    UNIQUE INDEX `nutre_body_measurement_user_id_measured_on_key`(`user_id`, `measured_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutre_activity_type` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NULL,
    `name` VARCHAR(120) NOT NULL,
    `met` DECIMAL(4, 2) NOT NULL,
    `icon` VARCHAR(64) NULL,
    `owner_user_id` CHAR(36) NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nutre_activity_type_code_key`(`code`),
    INDEX `nutre_activity_type_owner_user_id_idx`(`owner_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutre_activity_session` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `activity_type_id` CHAR(36) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `logged_on` DATE NOT NULL,
    `duration_sec` INTEGER NOT NULL,
    `distance_m` INTEGER NULL,
    `avg_heart_rate` INTEGER NULL,
    `effort` ENUM('LIGHT', 'MODERATE', 'VIGOROUS') NULL,
    `kcal_burned` INTEGER NOT NULL,
    `notes` VARCHAR(500) NULL,
    `source` ENUM('MANUAL', 'HEALTHKIT', 'GOOGLE_FIT', 'STRAVA', 'GARMIN') NOT NULL DEFAULT 'MANUAL',
    `external_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nutre_activity_session_user_id_logged_on_idx`(`user_id`, `logged_on`),
    INDEX `nutre_activity_session_activity_type_id_idx`(`activity_type_id`),
    UNIQUE INDEX `nutre_activity_session_source_external_id_key`(`source`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutre_food` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `brand` VARCHAR(120) NULL,
    `barcode` VARCHAR(32) NULL,
    `source` ENUM('CURATED', 'OPEN_FOOD_FACTS', 'USER') NOT NULL DEFAULT 'CURATED',
    `external_id` VARCHAR(191) NULL,
    `owner_user_id` CHAR(36) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `is_liquid` BOOLEAN NOT NULL DEFAULT false,
    `kcal_per_100` INTEGER NOT NULL,
    `protein_per_100_g` DECIMAL(6, 2) NOT NULL,
    `carbs_per_100_g` DECIMAL(6, 2) NOT NULL,
    `fat_per_100_g` DECIMAL(6, 2) NOT NULL,
    `fiber_per_100_g` DECIMAL(6, 2) NULL,
    `sugar_per_100_g` DECIMAL(6, 2) NULL,
    `saturated_per_100_g` DECIMAL(6, 2) NULL,
    `sodium_per_100_mg` DECIMAL(8, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nutre_food_barcode_key`(`barcode`),
    INDEX `nutre_food_owner_user_id_idx`(`owner_user_id`),
    INDEX `nutre_food_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutre_food_serving` (
    `id` CHAR(36) NOT NULL,
    `food_id` CHAR(36) NOT NULL,
    `label` VARCHAR(80) NOT NULL,
    `grams` DECIMAL(7, 2) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `nutre_food_serving_food_id_label_key`(`food_id`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutre_meal_entry` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `logged_on` DATE NOT NULL,
    `meal_type` ENUM('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK') NOT NULL,
    `food_id` CHAR(36) NULL,
    `serving_id` CHAR(36) NULL,
    `custom_name` VARCHAR(200) NULL,
    `quantity_g` DECIMAL(7, 2) NOT NULL,
    `kcal` INTEGER NOT NULL,
    `protein_g` DECIMAL(6, 2) NOT NULL,
    `carbs_g` DECIMAL(6, 2) NOT NULL,
    `fat_g` DECIMAL(6, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nutre_meal_entry_user_id_logged_on_idx`(`user_id`, `logged_on`),
    INDEX `nutre_meal_entry_food_id_idx`(`food_id`),
    INDEX `nutre_meal_entry_serving_id_idx`(`serving_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutre_daily_log` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `log_date` DATE NOT NULL,
    `kcal_in` INTEGER NOT NULL DEFAULT 0,
    `kcal_burned` INTEGER NOT NULL DEFAULT 0,
    `kcal_target` INTEGER NULL,
    `protein_g` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `carbs_g` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `fat_g` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `steps` INTEGER NULL,
    `water_ml` INTEGER NULL,
    `weight_kg` DECIMAL(5, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `nutre_daily_log_user_id_log_date_idx`(`user_id`, `log_date`),
    UNIQUE INDEX `nutre_daily_log_user_id_log_date_key`(`user_id`, `log_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `nutre_profile` ADD CONSTRAINT `nutre_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_body_measurement` ADD CONSTRAINT `nutre_body_measurement_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_activity_type` ADD CONSTRAINT `nutre_activity_type_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_activity_session` ADD CONSTRAINT `nutre_activity_session_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_activity_session` ADD CONSTRAINT `nutre_activity_session_activity_type_id_fkey` FOREIGN KEY (`activity_type_id`) REFERENCES `nutre_activity_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_food` ADD CONSTRAINT `nutre_food_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_food_serving` ADD CONSTRAINT `nutre_food_serving_food_id_fkey` FOREIGN KEY (`food_id`) REFERENCES `nutre_food`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_meal_entry` ADD CONSTRAINT `nutre_meal_entry_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_meal_entry` ADD CONSTRAINT `nutre_meal_entry_food_id_fkey` FOREIGN KEY (`food_id`) REFERENCES `nutre_food`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_meal_entry` ADD CONSTRAINT `nutre_meal_entry_serving_id_fkey` FOREIGN KEY (`serving_id`) REFERENCES `nutre_food_serving`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutre_daily_log` ADD CONSTRAINT `nutre_daily_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

