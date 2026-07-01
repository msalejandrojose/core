-- Add GAUGE to the widget_type enum
ALTER TABLE `dashboard_widget`
  MODIFY COLUMN `widget_type` ENUM('KPI_CARD', 'LINE', 'BAR', 'AREA', 'GAUGE') NOT NULL;
