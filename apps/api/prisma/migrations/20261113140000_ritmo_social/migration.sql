-- CreateTable
CREATE TABLE `ritmo_social_profile` (
    `user_id` CHAR(36) NOT NULL,
    `handle` VARCHAR(30) NOT NULL,
    `share_activity` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ritmo_social_profile_handle_key`(`handle`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_follow` (
    `follower_id` CHAR(36) NOT NULL,
    `followee_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ritmo_follow_followee_id_idx`(`followee_id`),
    PRIMARY KEY (`follower_id`, `followee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_cheer` (
    `user_id` CHAR(36) NOT NULL,
    `target_key` VARCHAR(80) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ritmo_cheer_target_key_idx`(`target_key`),
    PRIMARY KEY (`user_id`, `target_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_challenge` (
    `id` CHAR(36) NOT NULL,
    `owner_id` CHAR(36) NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `start_day` DATE NOT NULL,
    `end_day` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ritmo_challenge_end_day_idx`(`end_day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_challenge_member` (
    `challenge_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,

    INDEX `ritmo_challenge_member_user_id_idx`(`user_id`),
    PRIMARY KEY (`challenge_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_social_profile` ADD CONSTRAINT `ritmo_social_profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_follow` ADD CONSTRAINT `ritmo_follow_follower_id_fkey` FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_follow` ADD CONSTRAINT `ritmo_follow_followee_id_fkey` FOREIGN KEY (`followee_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_cheer` ADD CONSTRAINT `ritmo_cheer_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_challenge` ADD CONSTRAINT `ritmo_challenge_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_challenge_member` ADD CONSTRAINT `ritmo_challenge_member_challenge_id_fkey` FOREIGN KEY (`challenge_id`) REFERENCES `ritmo_challenge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_challenge_member` ADD CONSTRAINT `ritmo_challenge_member_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

