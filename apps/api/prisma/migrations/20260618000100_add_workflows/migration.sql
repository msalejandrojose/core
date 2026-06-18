-- CreateTable
CREATE TABLE `workflow_event` (
    `id` CHAR(36) NOT NULL,
    `type` VARCHAR(120) NOT NULL,
    `payload` JSON NOT NULL,
    `source_user_id` CHAR(36) NULL,
    `correlation_id` CHAR(36) NULL,
    `idempotency_key` VARCHAR(120) NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `workflow_event_type_occurred_at_idx`(`type`, `occurred_at`),
    INDEX `workflow_event_source_user_id_idx`(`source_user_id`),
    INDEX `workflow_event_correlation_id_idx`(`correlation_id`),
    UNIQUE INDEX `workflow_event_idempotency_key_key`(`idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_definition` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `version` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `dsl` JSON NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `published_at` DATETIME(3) NULL,

    INDEX `workflow_definition_key_is_active_idx`(`key`, `is_active`),
    UNIQUE INDEX `workflow_definition_key_version_key`(`key`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_trigger` (
    `id` CHAR(36) NOT NULL,
    `definition_id` CHAR(36) NOT NULL,
    `kind` ENUM('EVENT', 'CRON', 'MANUAL') NOT NULL,
    `event_type` VARCHAR(120) NULL,
    `match_expression` JSON NULL,
    `cron_expression` VARCHAR(60) NULL,
    `cron_payload` JSON NULL,
    `next_fire_at` DATETIME(3) NULL,

    INDEX `workflow_trigger_kind_event_type_idx`(`kind`, `event_type`),
    INDEX `workflow_trigger_kind_next_fire_at_idx`(`kind`, `next_fire_at`),
    INDEX `workflow_trigger_definition_id_idx`(`definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_run` (
    `id` CHAR(36) NOT NULL,
    `definition_id` CHAR(36) NOT NULL,
    `trigger_event_id` CHAR(36) NULL,
    `status` ENUM('RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELED') NOT NULL DEFAULT 'RUNNING',
    `context` JSON NOT NULL,
    `current_step_key` VARCHAR(120) NULL,
    `is_dry_run` BOOLEAN NOT NULL DEFAULT false,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `last_error` TEXT NULL,
    `locked_by` VARCHAR(80) NULL,
    `locked_until` DATETIME(3) NULL,

    INDEX `workflow_run_status_idx`(`status`),
    INDEX `workflow_run_definition_id_status_idx`(`definition_id`, `status`),
    INDEX `workflow_run_locked_until_idx`(`locked_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_step_execution` (
    `id` CHAR(36) NOT NULL,
    `run_id` CHAR(36) NOT NULL,
    `step_key` VARCHAR(120) NOT NULL,
    `action_key` VARCHAR(120) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `attempt` INTEGER NOT NULL DEFAULT 1,
    `input` JSON NULL,
    `output` JSON NULL,
    `error` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    INDEX `workflow_step_execution_run_id_started_at_idx`(`run_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_pending_action` (
    `id` CHAR(36) NOT NULL,
    `run_id` CHAR(36) NULL,
    `definition_id` CHAR(36) NULL,
    `trigger_event_id` CHAR(36) NULL,
    `step_key` VARCHAR(120) NULL,
    `kind` ENUM('DELAY', 'WAIT_EVENT', 'RETRY', 'PENDING_START') NOT NULL,
    `status` ENUM('PENDING', 'CONSUMED', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `run_at` DATETIME(3) NULL,
    `event_type` VARCHAR(120) NULL,
    `match_expression` JSON NULL,
    `consumed_event_id` CHAR(36) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `consumed_at` DATETIME(3) NULL,

    INDEX `workflow_pending_action_status_run_at_idx`(`status`, `run_at`),
    INDEX `workflow_pending_action_status_event_type_idx`(`status`, `event_type`),
    INDEX `workflow_pending_action_status_kind_definition_id_created_at_idx`(`status`, `kind`, `definition_id`, `created_at`),
    INDEX `workflow_pending_action_run_id_idx`(`run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- AddForeignKey
ALTER TABLE `workflow_trigger` ADD CONSTRAINT `workflow_trigger_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `workflow_definition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_run` ADD CONSTRAINT `workflow_run_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `workflow_definition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_run` ADD CONSTRAINT `workflow_run_trigger_event_id_fkey` FOREIGN KEY (`trigger_event_id`) REFERENCES `workflow_event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_step_execution` ADD CONSTRAINT `workflow_step_execution_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `workflow_run`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_pending_action` ADD CONSTRAINT `workflow_pending_action_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `workflow_run`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_pending_action` ADD CONSTRAINT `workflow_pending_action_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `workflow_definition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_pending_action` ADD CONSTRAINT `workflow_pending_action_consumed_event_id_fkey` FOREIGN KEY (`consumed_event_id`) REFERENCES `workflow_event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

