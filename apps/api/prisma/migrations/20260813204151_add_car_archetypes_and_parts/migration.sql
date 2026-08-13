-- CreateTable
CREATE TABLE `racing_car_archetype` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `speed_scale` DOUBLE NOT NULL,
    `grip` DOUBLE NOT NULL,
    `offroad_grip_modifier` DOUBLE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_car_archetype_code_key`(`code`),
    INDEX `racing_car_archetype_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_car_part` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `category` ENUM('TIRES', 'WING', 'CHASSIS') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `speed_scale` DOUBLE NOT NULL,
    `grip` DOUBLE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_car_part_code_key`(`code`),
    INDEX `racing_car_part_category_is_active_idx`(`category`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_player_car_archetype` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `archetype_id` CHAR(36) NOT NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `racing_player_car_archetype_user_id_archetype_id_key`(`user_id`, `archetype_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_player_car_part` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `part_id` CHAR(36) NOT NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `racing_player_car_part_user_id_part_id_key`(`user_id`, `part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_player_car_loadout` (
    `user_id` CHAR(36) NOT NULL,
    `archetype_id` CHAR(36) NOT NULL,
    `tires_part_id` CHAR(36) NULL,
    `wing_part_id` CHAR(36) NULL,
    `chassis_part_id` CHAR(36) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `racing_player_car_archetype` ADD CONSTRAINT `racing_player_car_archetype_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_archetype` ADD CONSTRAINT `racing_player_car_archetype_archetype_id_fkey` FOREIGN KEY (`archetype_id`) REFERENCES `racing_car_archetype`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_part` ADD CONSTRAINT `racing_player_car_part_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_part` ADD CONSTRAINT `racing_player_car_part_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `racing_car_part`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_loadout` ADD CONSTRAINT `racing_player_car_loadout_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_loadout` ADD CONSTRAINT `racing_player_car_loadout_archetype_id_fkey` FOREIGN KEY (`archetype_id`) REFERENCES `racing_car_archetype`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_loadout` ADD CONSTRAINT `racing_player_car_loadout_tires_part_id_fkey` FOREIGN KEY (`tires_part_id`) REFERENCES `racing_car_part`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_loadout` ADD CONSTRAINT `racing_player_car_loadout_wing_part_id_fkey` FOREIGN KEY (`wing_part_id`) REFERENCES `racing_car_part`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_loadout` ADD CONSTRAINT `racing_player_car_loadout_chassis_part_id_fkey` FOREIGN KEY (`chassis_part_id`) REFERENCES `racing_car_part`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
