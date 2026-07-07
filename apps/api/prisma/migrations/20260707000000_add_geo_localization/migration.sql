-- CreateTable
CREATE TABLE `country` (
    `id` CHAR(36) NOT NULL,
    `iso2` CHAR(2) NOT NULL,
    `iso3` CHAR(3) NOT NULL,
    `numeric_code` CHAR(3) NULL,
    `name` VARCHAR(120) NOT NULL,
    `native_name` VARCHAR(120) NULL,
    `phone_code` VARCHAR(8) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `country_iso2_key`(`iso2`),
    UNIQUE INDEX `country_iso3_key`(`iso3`),
    INDEX `country_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `region` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `region_country_id_idx`(`country_id`),
    INDEX `region_name_idx`(`name`),
    UNIQUE INDEX `region_country_id_code_key`(`country_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `province` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `country_id` CHAR(36) NOT NULL,
    `region_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `province_country_id_idx`(`country_id`),
    INDEX `province_region_id_idx`(`region_id`),
    INDEX `province_name_idx`(`name`),
    UNIQUE INDEX `province_country_id_code_key`(`country_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `municipality` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `province_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `municipality_province_id_idx`(`province_id`),
    INDEX `municipality_name_idx`(`name`),
    UNIQUE INDEX `municipality_province_id_code_key`(`province_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `postal_code` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `municipality_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `postal_code_municipality_id_idx`(`municipality_id`),
    INDEX `postal_code_code_idx`(`code`),
    UNIQUE INDEX `postal_code_municipality_id_code_key`(`municipality_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `region` ADD CONSTRAINT `region_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `province` ADD CONSTRAINT `province_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `country`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `province` ADD CONSTRAINT `province_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `region`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `municipality` ADD CONSTRAINT `municipality_province_id_fkey` FOREIGN KEY (`province_id`) REFERENCES `province`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `postal_code` ADD CONSTRAINT `postal_code_municipality_id_fkey` FOREIGN KEY (`municipality_id`) REFERENCES `municipality`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
