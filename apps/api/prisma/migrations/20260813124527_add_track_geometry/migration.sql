/*
  Warnings:

  - Added the required column `path` to the `racing_track` table without a default value. This is not possible if the table is not empty, so `path` se añade NULL y se rellena antes de cerrarla.

*/
-- AlterTable
ALTER TABLE `racing_track` ADD COLUMN `grip` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `path` JSON NULL,
    ADD COLUMN `theme` ENUM('MEADOW', 'SNOW') NOT NULL DEFAULT 'MEADOW';

-- Backfill de la geometría de los 4 circuitos ya sembrados, celda a celda
-- igual que `apps/game/scripts/track/track_catalog.gd`. El patrón de slug
-- cubre todas las variantes (sentido y cilindrada) porque comparten trazado.
UPDATE `racing_track` SET `path` = '[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":-1,"y":2},{"x":-2,"y":2},{"x":-2,"y":1},{"x":-2,"y":0},{"x":-2,"y":-1},{"x":-3,"y":-1},{"x":-3,"y":-2},{"x":-3,"y":-3},{"x":-2,"y":-3},{"x":-1,"y":-3},{"x":0,"y":-3},{"x":0,"y":-2},{"x":0,"y":-1}]'
  WHERE `slug` LIKE 'kenney-01%';

UPDATE `racing_track` SET `path` = '[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":0,"y":3},{"x":0,"y":4},{"x":-1,"y":4},{"x":-2,"y":4},{"x":-2,"y":3},{"x":-2,"y":2},{"x":-3,"y":2},{"x":-4,"y":2},{"x":-4,"y":1},{"x":-4,"y":0},{"x":-4,"y":-1},{"x":-3,"y":-1},{"x":-2,"y":-1},{"x":-1,"y":-1},{"x":0,"y":-1}]'
  WHERE `slug` LIKE 'herradura%';

UPDATE `racing_track` SET `path` = '[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":-1,"y":2},{"x":-1,"y":3},{"x":-2,"y":3},{"x":-2,"y":2},{"x":-3,"y":2},{"x":-3,"y":1},{"x":-3,"y":0},{"x":-3,"y":-1},{"x":-2,"y":-1},{"x":-1,"y":-1},{"x":0,"y":-1}]'
  WHERE `slug` LIKE 'chicane%';

UPDATE `racing_track` SET
    `path` = '[{"x":0,"y":0},{"x":0,"y":1},{"x":0,"y":2},{"x":0,"y":3},{"x":-1,"y":3},{"x":-2,"y":3},{"x":-2,"y":2},{"x":-2,"y":1},{"x":-3,"y":1},{"x":-4,"y":1},{"x":-4,"y":2},{"x":-4,"y":3},{"x":-5,"y":3},{"x":-6,"y":3},{"x":-6,"y":2},{"x":-6,"y":1},{"x":-6,"y":0},{"x":-6,"y":-1},{"x":-5,"y":-1},{"x":-4,"y":-1},{"x":-3,"y":-1},{"x":-3,"y":-2},{"x":-2,"y":-2},{"x":-2,"y":-1},{"x":-1,"y":-1},{"x":0,"y":-1}]',
    `theme` = 'SNOW',
    `grip` = 0.55
  WHERE `slug` LIKE 'nevado%';

-- AlterTable
ALTER TABLE `racing_track` MODIFY COLUMN `path` JSON NOT NULL;
