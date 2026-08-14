-- CreateTable
CREATE TABLE `racing_terrain_effect` (
    `id` CHAR(36) NOT NULL,
    `type` ENUM('ASPHALT', 'ICE', 'MUD', 'WATER') NOT NULL,
    `grip` DOUBLE NOT NULL,
    `slows_top_speed` BOOLEAN NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `racing_terrain_effect_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
