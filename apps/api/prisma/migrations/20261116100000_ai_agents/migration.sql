-- CreateTable
CREATE TABLE `ai_model` (
    `id` CHAR(36) NOT NULL,
    `provider` VARCHAR(16) NOT NULL,
    `model_id` VARCHAR(64) NOT NULL,
    `label` VARCHAR(80) NOT NULL,
    `input_price_per_m` DECIMAL(10, 4) NOT NULL,
    `cached_input_price_per_m` DECIMAL(10, 4) NOT NULL,
    `output_price_per_m` DECIMAL(10, 4) NOT NULL,
    `efforts` VARCHAR(80) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_model_model_id_key`(`model_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_skill` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `instructions` TEXT NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_skill_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_agent` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(500) NULL,
    `instructions` TEXT NOT NULL,
    `model_id` CHAR(36) NOT NULL,
    `reasoning_effort` VARCHAR(16) NOT NULL DEFAULT 'low',
    `max_output_tokens` INTEGER NOT NULL DEFAULT 1200,
    `tools` VARCHAR(1000) NOT NULL DEFAULT '',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ai_agent_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_agent_skill` (
    `agent_id` CHAR(36) NOT NULL,
    `skill_id` CHAR(36) NOT NULL,

    PRIMARY KEY (`agent_id`, `skill_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_conversation` (
    `id` CHAR(36) NOT NULL,
    `agent_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ai_conversation_user_id_agent_id_updated_at_idx`(`user_id`, `agent_id`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_message` (
    `id` CHAR(36) NOT NULL,
    `conversation_id` CHAR(36) NOT NULL,
    `role` VARCHAR(16) NOT NULL,
    `content` TEXT NOT NULL,
    `tools_used` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_message_conversation_id_created_at_idx`(`conversation_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_request` (
    `id` CHAR(36) NOT NULL,
    `agent_id` CHAR(36) NULL,
    `user_id` CHAR(36) NULL,
    `conversation_id` CHAR(36) NULL,
    `provider` VARCHAR(16) NOT NULL,
    `model_id` VARCHAR(64) NOT NULL,
    `reasoning_effort` VARCHAR(16) NULL,
    `input_tokens` INTEGER NOT NULL DEFAULT 0,
    `cached_input_tokens` INTEGER NOT NULL DEFAULT 0,
    `output_tokens` INTEGER NOT NULL DEFAULT 0,
    `reasoning_tokens` INTEGER NOT NULL DEFAULT 0,
    `cost_usd` DECIMAL(12, 6) NOT NULL DEFAULT 0,
    `duration_ms` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(8) NOT NULL,
    `error` VARCHAR(1000) NULL,
    `tool_calls` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ai_request_created_at_idx`(`created_at`),
    INDEX `ai_request_agent_id_created_at_idx`(`agent_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_agent` ADD CONSTRAINT `ai_agent_model_id_fkey` FOREIGN KEY (`model_id`) REFERENCES `ai_model`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_agent_skill` ADD CONSTRAINT `ai_agent_skill_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `ai_agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_agent_skill` ADD CONSTRAINT `ai_agent_skill_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `ai_skill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_conversation` ADD CONSTRAINT `ai_conversation_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `ai_agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_conversation` ADD CONSTRAINT `ai_conversation_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_message` ADD CONSTRAINT `ai_message_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_request` ADD CONSTRAINT `ai_request_agent_id_fkey` FOREIGN KEY (`agent_id`) REFERENCES `ai_agent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_request` ADD CONSTRAINT `ai_request_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_request` ADD CONSTRAINT `ai_request_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `ai_conversation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

