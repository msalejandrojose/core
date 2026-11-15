-- CreateTable
CREATE TABLE `brio_bowel_movement` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL,
    `logged_on` DATE NOT NULL,
    `bristol_type` TINYINT NOT NULL,
    `amount` VARCHAR(8) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `brio_bowel_movement_user_id_logged_on_idx`(`user_id`, `logged_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `brio_bowel_movement` ADD CONSTRAINT `brio_bowel_movement_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

