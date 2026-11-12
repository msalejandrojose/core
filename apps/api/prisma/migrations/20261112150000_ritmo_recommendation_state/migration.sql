-- CreateTable
CREATE TABLE `ritmo_recommendation_state` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `status` ENUM('ACTIVE', 'DISMISSED', 'RESOLVED') NOT NULL DEFAULT 'ACTIVE',
    `first_detected_on` DATE NOT NULL,
    `last_seen_on` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ritmo_recommendation_state_user_id_key_key`(`user_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_recommendation_state` ADD CONSTRAINT `ritmo_recommendation_state_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

