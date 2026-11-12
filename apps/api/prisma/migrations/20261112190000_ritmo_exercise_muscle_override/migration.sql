-- CreateTable
CREATE TABLE `ritmo_exercise_muscle_override` (
    `user_id` CHAR(36) NOT NULL,
    `exercise_id` CHAR(36) NOT NULL,
    `muscle` ENUM('CHEST', 'LATS', 'TRAPS', 'FRONT_DELT', 'SIDE_DELT', 'REAR_DELT', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'ABS', 'LOWER_BACK') NOT NULL,
    `weight` DECIMAL(3, 2) NOT NULL,

    PRIMARY KEY (`user_id`, `exercise_id`, `muscle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_exercise_muscle_override` ADD CONSTRAINT `ritmo_exercise_muscle_override_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_exercise_muscle_override` ADD CONSTRAINT `ritmo_exercise_muscle_override_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `ritmo_exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

