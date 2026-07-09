// Utilidades para servir binarios inline con soporte de HTTP Range (RFC 7233).
// Solo se soporta un único rango por petición (lo que usan los navegadores para
// hacer seek en <video>/<audio>); las peticiones multi-rango se rechazan.

export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Interpreta la cabecera `Range` contra el tamaño total del recurso.
 * Acepta `bytes=start-end`, `bytes=start-` y `bytes=-suffix`.
 * Devuelve `null` si es sintácticamente inválida, multi-rango o no satisfacible
 * (en cuyo caso el caller debe responder 416).
 */
export function parseSingleRange(
  header: string,
  total: number,
): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;

  let start: number;
  let end: number;
  if (match[1] === '') {
    // Sufijo: los últimos N bytes.
    const suffix = Number(match[2]);
    if (suffix <= 0) return null;
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? total - 1 : Number(match[2]);
  }

  end = Math.min(end, total - 1);
  if (start > end || start >= total) return null;
  return { start, end };
}

/**
 * Evita romper la cabecera `Content-Disposition` con comillas o saltos de línea
 * presentes en el nombre original del fichero.
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/["\r\n]/g, '_');
}
