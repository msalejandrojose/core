-- CreateTable
CREATE TABLE `racing_friend_code` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `code` VARCHAR(8) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `racing_friend_code_user_id_key`(`user_id`),
    UNIQUE INDEX `racing_friend_code_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `racing_friendship` (
    `id` CHAR(36) NOT NULL,
    `requester_id` CHAR(36) NOT NULL,
    `addressee_id` CHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `responded_at` DATETIME(3) NULL,

    INDEX `racing_friendship_requester_id_status_idx`(`requester_id`, `status`),
    INDEX `racing_friendship_addressee_id_status_idx`(`addressee_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `racing_friend_code` ADD CONSTRAINT `racing_friend_code_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_friendship` ADD CONSTRAINT `racing_friendship_requester_id_fkey` FOREIGN KEY (`requester_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `racing_friendship` ADD CONSTRAINT `racing_friendship_addressee_id_fkey` FOREIGN KEY (`addressee_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
