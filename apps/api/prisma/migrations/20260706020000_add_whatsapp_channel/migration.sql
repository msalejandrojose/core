-- Añade WHATSAPP al enum NotificationChannel (usado en las dos tablas que lo referencian).
ALTER TABLE `sending_account_type`
  MODIFY COLUMN `channel` ENUM('EMAIL', 'SMS', 'PUSH', 'WHATSAPP') NOT NULL;

ALTER TABLE `notification_delivery`
  MODIFY COLUMN `channel` ENUM('EMAIL', 'SMS', 'PUSH', 'WHATSAPP') NOT NULL;
