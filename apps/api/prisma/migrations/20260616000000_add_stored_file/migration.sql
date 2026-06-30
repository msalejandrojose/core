-- CreateTable stored_file
CREATE TABLE `stored_file` (
    `id` CHAR(36) NOT NULL,
    `owner_user_id` CHAR(36) NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(127) NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `driver` ENUM('LOCAL', 'S3', 'GCS') NOT NULL,
    `status` ENUM('PENDING', 'READY') NOT NULL DEFAULT 'READY',
    `storage_key` VARCHAR(512) NOT NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `stored_file_owner_user_id_idx` ON `stored_file`(`owner_user_id`);

-- AddForeignKey
ALTER TABLE `stored_file` ADD CONSTRAINT `stored_file_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
