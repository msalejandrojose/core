-- AlterTable: target (fan-out) para triggers de workflow.
ALTER TABLE `workflow_trigger` ADD COLUMN `target` JSON NULL;
