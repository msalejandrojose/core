-- Comidas planificadas en el menú de la semana: alimentos y recetas por día y comida.
CREATE TABLE `brio_planned_meal` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `day` DATE NOT NULL,
    `meal` VARCHAR(16) NOT NULL,
    `food_id` CHAR(36) NULL,
    `serving_id` CHAR(36) NULL,
    `serving_label` VARCHAR(80) NULL,
    `name` VARCHAR(200) NOT NULL,
    `quantity` DECIMAL(7, 2) NOT NULL,
    `quantity_g` DECIMAL(7, 2) NOT NULL,
    `kcal` INTEGER NOT NULL,
    `protein_g` DECIMAL(6, 2) NOT NULL,
    `carbs_g` DECIMAL(6, 2) NOT NULL,
    `fat_g` DECIMAL(6, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `brio_planned_meal_user_id_day_idx`(`user_id`, `day`),
    INDEX `brio_planned_meal_food_id_idx`(`food_id`),
    INDEX `brio_planned_meal_serving_id_idx`(`serving_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `brio_planned_meal` ADD CONSTRAINT `brio_planned_meal_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `brio_planned_meal` ADD CONSTRAINT `brio_planned_meal_food_id_fkey` FOREIGN KEY (`food_id`) REFERENCES `brio_food`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `brio_planned_meal` ADD CONSTRAINT `brio_planned_meal_serving_id_fkey` FOREIGN KEY (`serving_id`) REFERENCES `brio_food_serving`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
