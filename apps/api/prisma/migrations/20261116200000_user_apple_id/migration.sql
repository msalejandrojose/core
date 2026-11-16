-- AlterTable
ALTER TABLE `user` ADD COLUMN `apple_id` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_apple_id_key` ON `user`(`apple_id`);

