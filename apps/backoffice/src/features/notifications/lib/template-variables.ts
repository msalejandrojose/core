const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Detecta las variables `{{ var }}` (o `{{ ruta.punteada }}`) usadas en el
 * `content` de un tipo de mensaje. `to` se excluye porque ya tiene su propio
 * campo en el preview (el destinatario de prueba).
 */
export function extractTemplateVariables(content: unknown): string[] {
  const json = JSON.stringify(content ?? {});
  const set = new Set<string>();
  for (const m of json.matchAll(PLACEHOLDER)) {
    const path = m[1].trim();
    if (path && path !== 'to') set.add(path);
  }
  return [...set].sort();
}

/** Convierte los valores planos del formulario de preview en el objeto anidado que espera el renderer (soporta `foo.bar`). */
export function buildVariablesPayload(
  paths: string[],
  values: Record<string, string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of paths) {
    const segments = path.split('.');
    let cursor = out;
    segments.forEach((segment, i) => {
      if (i === segments.length - 1) {
        cursor[segment] = values[path] ?? '';
        return;
      }
      const existing = cursor[segment];
      cursor[segment] =
        typeof existing === 'object' && existing !== null ? existing : {};
      cursor = cursor[segment] as Record<string, unknown>;
    });
  }
  return out;
}
