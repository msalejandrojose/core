-- CreateTable
CREATE TABLE `racing_car_skin` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `model_path` VARCHAR(255) NOT NULL,
    `is_unlocked_by_default` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_car_skin_code_key`(`code`),
    INDEX `racing_car_skin_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_player_car_skin` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `skin_id` CHAR(36) NOT NULL,
    `unlocked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `racing_player_car_skin_user_id_skin_id_key`(`user_id`, `skin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `racing_player_car_loadout` ADD COLUMN `skin_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `racing_player_car_skin` ADD CONSTRAINT `racing_player_car_skin_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_skin` ADD CONSTRAINT `racing_player_car_skin_skin_id_fkey` FOREIGN KEY (`skin_id`) REFERENCES `racing_car_skin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_player_car_loadout` ADD CONSTRAINT `racing_player_car_loadout_skin_id_fkey` FOREIGN KEY (`skin_id`) REFERENCES `racing_car_skin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
