-- Repeticiones y peso de cada serie de un ejercicio de rutina (nulo = todas iguales).
ALTER TABLE `brio_routine_exercise` ADD COLUMN `set_plan` JSON NULL;
