-- CreateTable post_category
CREATE TABLE `post_category` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(140) NOT NULL,
    `name` VARCHAR(140) NOT NULL,
    `description` TEXT NULL,
    `parent_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `post_category_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable post_tag
CREATE TABLE `post_tag` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(140) NOT NULL,
    `name` VARCHAR(140) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `post_tag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable post
CREATE TABLE `post` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `excerpt` VARCHAR(320) NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `published_at` DATETIME(3) NULL,
    `cover_image_id` CHAR(36) NULL,
    `author_id` CHAR(36) NULL,
    `meta_title` VARCHAR(200) NULL,
    `meta_description` VARCHAR(320) NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `category_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `post_slug_key`(`slug`),
    INDEX `post_status_published_at_idx`(`status`, `published_at`),
    INDEX `post_category_id_idx`(`category_id`),
    INDEX `post_author_id_idx`(`author_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4;

-- CreateTable post_tag_on_post
CREATE TABLE `post_tag_on_post` (
    `post_id` CHAR(36) NOT NULL,
    `tag_id` CHAR(36) NOT NULL,

    INDEX `post_tag_on_post_tag_id_idx`(`tag_id`),
    PRIMARY KEY (`post_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4;

-- AddForeignKey
ALTER TABLE `post_category` ADD CONSTRAINT `post_category_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `post_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `post_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post` ADD CONSTRAINT `post_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `post_category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_tag_on_post` ADD CONSTRAINT `post_tag_on_post_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_tag_on_post` ADD CONSTRAINT `post_tag_on_post_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `post_tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
