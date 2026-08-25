/*
  Warnings:

  - You are about to drop the column `grip` on the `racing_track` table. All the data in the column will be lost.
  - You are about to drop the column `image_id` on the `racing_track` table. All the data in the column will be lost.
  - You are about to drop the column `path` on the `racing_track` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `racing_track` table. All the data in the column will be lost.
  - Made the column `circuit_id` on table `racing_track` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `racing_track` DROP FOREIGN KEY `racing_track_circuit_id_fkey`;

-- AlterTable
ALTER TABLE `racing_track` DROP COLUMN `grip`,
    DROP COLUMN `image_id`,
    DROP COLUMN `path`,
    DROP COLUMN `theme`,
    MODIFY `circuit_id` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `racing_track` ADD CONSTRAINT `racing_track_circuit_id_fkey` FOREIGN KEY (`circuit_id`) REFERENCES `racing_circuit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
