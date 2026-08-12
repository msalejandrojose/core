-- AlterTable
ALTER TABLE `user`
    ADD COLUMN `google_id` VARCHAR(255) NULL,
    ADD COLUMN `facebook_id` VARCHAR(255) NULL,
    ADD COLUMN `avatar_url` VARCHAR(1024) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_google_id_key` ON `user`(`google_id`);

-- CreateIndex
CREATE UNIQUE INDEX `user_facebook_id_key` ON `user`(`facebook_id`);
