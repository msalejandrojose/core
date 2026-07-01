-- CreateTable dashboard
CREATE TABLE `dashboard` (
    `id` VARCHAR(30) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `dashboard_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable dashboard_widget
CREATE TABLE `dashboard_widget` (
    `id` VARCHAR(30) NOT NULL,
    `dashboard_id` VARCHAR(30) NOT NULL,
    `kpi_slug` VARCHAR(100) NOT NULL,
    `widget_type` ENUM('KPI_CARD', 'LINE', 'BAR', 'AREA') NOT NULL,
    `x` INTEGER NOT NULL,
    `y` INTEGER NOT NULL,
    `w` INTEGER NOT NULL,
    `h` INTEGER NOT NULL,
    `config` JSON NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    INDEX `dashboard_widget_dashboard_id_idx`(`dashboard_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dashboard` ADD CONSTRAINT `dashboard_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dashboard_widget` ADD CONSTRAINT `dashboard_widget_dashboard_id_fkey` FOREIGN KEY (`dashboard_id`) REFERENCES `dashboard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
