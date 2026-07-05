// Renderer mínimo de plantillas `{{ ruta.punteada }}` para el contenido de un
// tipo de mensaje. Puro (sin deps): sustituye placeholders por lookup sobre el
// objeto de variables. Distinto del evaluador del motor de workflows (ese
// resuelve el `input` del step contra el scope del run; este resuelve el
// `content` del mensaje contra las variables ya resueltas que llegan al envío).
const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;

function lookup(path: string, vars: Record<string, unknown>): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, vars);
}

function stringify(v: unknown): string {
  if (v == null) return '';
  switch (typeof v) {
    case 'string':
      return v;
    case 'number':
    case 'boolean':
    case 'bigint':
      return String(v);
    default:
      return JSON.stringify(v) ?? '';
  }
}

function renderString(str: string, vars: Record<string, unknown>): string {
  return str.replace(PLACEHOLDER, (_m, path: string) =>
    stringify(lookup(path.trim(), vars)),
  );
}

// Renderiza recursivamente cualquier valor (string/array/objeto) sustituyendo
// los placeholders. Solo interpola strings; el resto se devuelve tal cual.
export function renderContent<T>(value: T, vars: Record<string, unknown>): T {
  if (typeof value === 'string') return renderString(value, vars) as T;
  if (Array.isArray(value)) {
    return value.map((v: unknown) => renderContent(v, vars)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = renderContent(v, vars);
    return out as T;
  }
  return value;
}
