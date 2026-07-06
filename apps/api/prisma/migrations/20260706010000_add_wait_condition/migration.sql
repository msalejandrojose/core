-- Añade el kind WAIT_CONDITION al enum de acciones diferidas.
ALTER TABLE `workflow_pending_action`
  MODIFY COLUMN `kind` ENUM('DELAY', 'WAIT_EVENT', 'WAIT_CONDITION', 'RETRY', 'PENDING_START') NOT NULL;

-- Fecha límite del wait (timeout) para WAIT_CONDITION/WAIT_EVENT.
ALTER TABLE `workflow_pending_action` ADD COLUMN `deadline_at` DATETIME(3) NULL;
