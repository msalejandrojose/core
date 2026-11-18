/** Helpers de la sección «Asistentes de IA» (conector MCP de Brío). */

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
/** URL del conector MCP de Brío, la que se pega en Claude (o en otro asistente). */
export const MCP_URL = `${API_URL}/v1/ritmo/mcp`;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "hace 5 min", "hace 3 h", "ayer", "el 12 nov". */
export function relativeTime(iso: string, now = Date.now()): string {
  const d = new Date(iso);
  const min = Math.round((now - d.getTime()) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) return 'ayer';
  return `el ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

