-- Ficha del ejercicio: qué es y técnica paso a paso (TASK-424).
ALTER TABLE `brio_exercise` ADD COLUMN `description` TEXT NULL;
ALTER TABLE `brio_exercise` ADD COLUMN `steps` JSON NULL;
