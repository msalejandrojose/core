-- CreateTable
CREATE TABLE `ritmo_menu_choice` (
    `user_id` CHAR(36) NOT NULL,
    `day` DATE NOT NULL,
    `meal` VARCHAR(16) NOT NULL,
    `dish_code` VARCHAR(64) NOT NULL,

    PRIMARY KEY (`user_id`, `day`, `meal`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_shopping_check` (
    `user_id` CHAR(36) NOT NULL,
    `week_start` DATE NOT NULL,
    `item_code` VARCHAR(64) NOT NULL,

    PRIMARY KEY (`user_id`, `week_start`, `item_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_menu_choice` ADD CONSTRAINT `ritmo_menu_choice_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_shopping_check` ADD CONSTRAINT `ritmo_shopping_check_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

