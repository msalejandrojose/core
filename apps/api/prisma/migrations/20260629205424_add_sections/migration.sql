-- CreateTable
CREATE TABLE `section` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `icon` VARCHAR(100) NULL,
    `route` VARCHAR(500) NULL,
    `parent_id` CHAR(36) NULL,
    `scope` ENUM('BACKOFFICE', 'APP', 'SHARED') NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `api_requirements` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `section_scope_is_active_order_idx`(`scope`, `is_active`, `order`),
    INDEX `section_parent_id_idx`(`parent_id`),
    UNIQUE INDEX `section_code_scope_key`(`code`, `scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_section_access` (
    `user_role_id` CHAR(36) NOT NULL,
    `section_id` CHAR(36) NOT NULL,
    `access` ENUM('GRANT', 'DENY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_section_access_section_id_idx`(`section_id`),
    PRIMARY KEY (`user_role_id`, `section_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_section_access` (
    `user_id` CHAR(36) NOT NULL,
    `section_id` CHAR(36) NOT NULL,
    `access` ENUM('GRANT', 'DENY') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_section_access_section_id_idx`(`section_id`),
    PRIMARY KEY (`user_id`, `section_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `section` ADD CONSTRAINT `section_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `section`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_section_access` ADD CONSTRAINT `role_section_access_user_role_id_fkey` FOREIGN KEY (`user_role_id`) REFERENCES `user_role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_section_access` ADD CONSTRAINT `role_section_access_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_section_access` ADD CONSTRAINT `user_section_access_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_section_access` ADD CONSTRAINT `user_section_access_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `section`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
