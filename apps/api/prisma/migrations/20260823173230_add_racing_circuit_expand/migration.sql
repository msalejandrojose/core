-- AlterTable
ALTER TABLE `racing_track` ADD COLUMN `circuit_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `racing_circuit` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `checkpoints` INTEGER NOT NULL,
    `path` JSON NOT NULL,
    `theme` ENUM('MEADOW', 'SNOW') NOT NULL DEFAULT 'MEADOW',
    `grip` DOUBLE NOT NULL DEFAULT 1.0,
    `image_id` CHAR(36) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_in_rotation` BOOLEAN NOT NULL DEFAULT true,
    `rotated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_circuit_slug_key`(`slug`),
    INDEX `racing_circuit_is_active_is_in_rotation_idx`(`is_active`, `is_in_rotation`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_circuit_rotation_config` (
    `id` CHAR(36) NOT NULL,
    `key` ENUM('CIRCUITS_PER_DAY') NOT NULL,
    `value` INTEGER NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_circuit_rotation_config_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `racing_track_circuit_id_idx` ON `racing_track`(`circuit_id`);

-- AddForeignKey
ALTER TABLE `racing_track` ADD CONSTRAINT `racing_track_circuit_id_fkey` FOREIGN KEY (`circuit_id`) REFERENCES `racing_circuit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
