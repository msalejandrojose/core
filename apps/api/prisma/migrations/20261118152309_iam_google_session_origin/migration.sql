-- AlterTable
ALTER TABLE `google_auth_session` ADD COLUMN `origin` VARCHAR(8) NOT NULL DEFAULT 'GAME';
