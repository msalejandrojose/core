-- CreateTable
CREATE TABLE `oauth_client` (
    `id` CHAR(36) NOT NULL,
    `client_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `redirect_uris` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oauth_client_client_id_key`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_authorization_code` (
    `id` CHAR(36) NOT NULL,
    `code_hash` CHAR(64) NOT NULL,
    `client_id` VARCHAR(64) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `redirect_uri` VARCHAR(2048) NOT NULL,
    `code_challenge` VARCHAR(128) NOT NULL,
    `scope` VARCHAR(255) NOT NULL,
    `resource` VARCHAR(2048) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oauth_authorization_code_code_hash_key`(`code_hash`),
    INDEX `oauth_authorization_code_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `oauth_token` (
    `id` CHAR(36) NOT NULL,
    `access_token_hash` CHAR(64) NOT NULL,
    `refresh_token_hash` CHAR(64) NOT NULL,
    `client_id` VARCHAR(64) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `scope` VARCHAR(255) NOT NULL,
    `resource` VARCHAR(2048) NULL,
    `access_expires_at` DATETIME(3) NOT NULL,
    `refresh_expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `oauth_token_access_token_hash_key`(`access_token_hash`),
    UNIQUE INDEX `oauth_token_refresh_token_hash_key`(`refresh_token_hash`),
    INDEX `oauth_token_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `oauth_authorization_code` ADD CONSTRAINT `oauth_authorization_code_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_authorization_code` ADD CONSTRAINT `oauth_authorization_code_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_token` ADD CONSTRAINT `oauth_token_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `oauth_token` ADD CONSTRAINT `oauth_token_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
