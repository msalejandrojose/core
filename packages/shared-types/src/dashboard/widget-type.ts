import { z } from 'zod';

export const WidgetTypeSchema = z.enum(['KPI_CARD', 'LINE', 'BAR', 'AREA', 'GAUGE']);
export type WidgetType = z.infer<typeof WidgetTypeSchema>;
