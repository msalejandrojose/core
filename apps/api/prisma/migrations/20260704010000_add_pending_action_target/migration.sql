-- AlterTable: target (entidad resuelta) para PENDING_START (fan-out diferido).
ALTER TABLE `workflow_pending_action` ADD COLUMN `target` JSON NULL;
