-- AddColumn email_verification_token
ALTER TABLE `user` ADD COLUMN `email_verification_token` VARCHAR(128) NULL;

-- AddColumn email_verification_expires_at
ALTER TABLE `user` ADD COLUMN `email_verification_expires_at` DATETIME(3) NULL;

-- AddColumn password_reset_token
ALTER TABLE `user` ADD COLUMN `password_reset_token` VARCHAR(128) NULL;

-- AddColumn password_reset_expires_at
ALTER TABLE `user` ADD COLUMN `password_reset_expires_at` DATETIME(3) NULL;
