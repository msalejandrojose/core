-- CreateTable
CREATE TABLE `ritmo_connection_prefs` (
    `user_id` CHAR(36) NOT NULL,
    `import_activities` BOOLEAN NOT NULL DEFAULT true,
    `import_health` BOOLEAN NOT NULL DEFAULT true,
    `exercise_kcal_share_pct` SMALLINT NOT NULL DEFAULT 100,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ritmo_connection_prefs` ADD CONSTRAINT `ritmo_connection_prefs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

