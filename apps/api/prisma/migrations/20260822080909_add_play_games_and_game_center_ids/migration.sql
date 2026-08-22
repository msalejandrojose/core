/*
  Warnings:

  - A unique constraint covering the columns `[play_games_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[game_center_id]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `game_center_id` VARCHAR(255) NULL,
    ADD COLUMN `play_games_id` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_play_games_id_key` ON `user`(`play_games_id`);

-- CreateIndex
CREATE UNIQUE INDEX `user_game_center_id_key` ON `user`(`game_center_id`);
