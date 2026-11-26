-- Actualizaciones en caliente (OTA) de las apps móviles.
CREATE TABLE `ota_bundle` (
    `id` CHAR(36) NOT NULL,
    `app_id` VARCHAR(120) NOT NULL,
    `channel` VARCHAR(40) NOT NULL DEFAULT 'production',
    `version` VARCHAR(60) NOT NULL,
    `min_native_version` VARCHAR(40) NOT NULL,
    `storage_key` VARCHAR(255) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `checksum` VARCHAR(1100) NOT NULL,
    `session_key` VARCHAR(1100) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `purged_at` DATETIME(3) NULL,
    `created_by_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ota_bundle_app_id_channel_version_key`(`app_id`, `channel`, `version`),
    INDEX `ota_bundle_app_id_channel_created_at_idx`(`app_id`, `channel`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
