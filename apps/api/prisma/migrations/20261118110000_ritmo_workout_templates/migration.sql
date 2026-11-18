-- CreateTable
CREATE TABLE `ritmo_workout_template` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ritmo_workout_template_user_id_name_key`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ritmo_workout_template_exercise` (
    `template_id` CHAR(36) NOT NULL,
    `position` SMALLINT NOT NULL,
    `exercise_id` CHAR(36) NOT NULL,
    `sets` SMALLINT NOT NULL,
    `reps` SMALLINT NULL,
    `weight_kg` DECIMAL(6, 2) NULL,

    INDEX `ritmo_workout_template_exercise_exercise_id_idx`(`exercise_id`),
    PRIMARY KEY (`template_id`, `position`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_workout_template` ADD CONSTRAINT `ritmo_workout_template_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_workout_template_exercise` ADD CONSTRAINT `ritmo_workout_template_exercise_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `ritmo_workout_template`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ritmo_workout_template_exercise` ADD CONSTRAINT `ritmo_workout_template_exercise_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `ritmo_exercise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
