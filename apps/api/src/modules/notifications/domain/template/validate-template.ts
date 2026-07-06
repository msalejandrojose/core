import { EMAIL_BLOCK_TYPES, type EmailBlockType } from './email-block';

// Validación server-side de una plantilla de email (`content.template`). Mismo
// espíritu estricto que `validate-fields.ts`: devuelve el primer error como
// string, o null si es válida. Rechaza claves/props no reconocidas.
//
// No comprueba placeholders `{{ var }}`: las props de texto son strings y se
// resuelven en el envío; aquí solo se valida la ESTRUCTURA y los tipos.

type PropKind = 'string' | 'number' | 'align';

interface PropSpec {
  kind: PropKind;
  required?: boolean;
}

// Props "planas" por tipo de bloque. Los tipos con props compuestas (columns,
// footer.links) se validan aparte más abajo.
const BLOCK_PROPS: Record<EmailBlockType, Record<string, PropSpec>> = {
  hero: {
    title: { kind: 'string', required: true },
    subtitle: { kind: 'string' },
    imageUrl: { kind: 'string' },
    backgroundColor: { kind: 'string' },
    textColor: { kind: 'string' },
    align: { kind: 'align' },
  },
  heading: {
    text: { kind: 'string', required: true },
    level: { kind: 'number' },
    align: { kind: 'align' },
  },
  text: {
    text: { kind: 'string', required: true },
    align: { kind: 'align' },
  },
  button: {
    label: { kind: 'string', required: true },
    href: { kind: 'string', required: true },
    backgroundColor: { kind: 'string' },
    textColor: { kind: 'string' },
    align: { kind: 'align' },
  },
  image: {
    src: { kind: 'string', required: true },
    alt: { kind: 'string' },
    href: { kind: 'string' },
    width: { kind: 'number' },
    align: { kind: 'align' },
  },
  divider: { color: { kind: 'string' } },
  spacer: { size: { kind: 'number' } },
  // columns/footer llevan props compuestas: se validan en validateBlock.
  columns: {},
  footer: {
    text: { kind: 'string' },
    backgroundColor: { kind: 'string' },
    textColor: { kind: 'string' },
  },
};

const ALIGNS = new Set(['left', 'center', 'right']);
const THEME_STRING_KEYS = new Set([
  'fontFamily',
  'backgroundColor',
  'contentBackgroundColor',
  'textColor',
  'accentColor',
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateProps(
  props: unknown,
  spec: Record<string, PropSpec>,
  extraKeys: string[],
  path: string,
): string | null {
  if (props === undefined) props = {};
  if (!isRecord(props)) return `${path}: "props" debe ser un objeto`;
  const known = new Set([...Object.keys(spec), ...extraKeys]);

  for (const key of Object.keys(props)) {
    if (!known.has(key)) return `${path}: prop no reconocida "${key}"`;
  }

  for (const [key, s] of Object.entries(spec)) {
    const value = props[key];
    const empty = value === undefined || value === null || value === '';
    if (s.required && empty) return `${path}: falta la prop requerida "${key}"`;
    if (empty) continue;

    switch (s.kind) {
      case 'string':
        if (typeof value !== 'string')
          return `${path}: "${key}" debe ser texto`;
        break;
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value))
          return `${path}: "${key}" debe ser un número`;
        break;
      case 'align':
        if (typeof value !== 'string' || !ALIGNS.has(value))
          return `${path}: "${key}" debe ser left, center o right`;
        break;
    }
  }
  return null;
}

function validateBlock(block: unknown, path: string): string | null {
  if (!isRecord(block)) return `${path}: cada bloque debe ser un objeto`;
  const type = block.type;
  if (typeof type !== 'string' || !EMAIL_BLOCK_TYPES.includes(type as never)) {
    return `${path}: tipo de bloque no soportado "${String(type)}"`;
  }
  const blockType = type as EmailBlockType;

  for (const key of Object.keys(block)) {
    if (key !== 'type' && key !== 'props') {
      return `${path}: clave no reconocida "${key}"`;
    }
  }

  const props = block.props;

  if (blockType === 'columns') {
    if (!isRecord(props) || !Array.isArray(props.columns)) {
      return `${path}: "columns" debe tener props.columns (array de columnas)`;
    }
    for (const key of Object.keys(props)) {
      if (key !== 'columns') return `${path}: prop no reconocida "${key}"`;
    }
    const columns = props.columns as unknown[];
    if (columns.length < 1 || columns.length > 4) {
      return `${path}: "columns" admite entre 1 y 4 columnas`;
    }
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c];
      if (!Array.isArray(col)) {
        return `${path}.columns[${c}] debe ser un array de bloques`;
      }
      const blocks = col as unknown[];
      for (let i = 0; i < blocks.length; i++) {
        const e = validateBlock(blocks[i], `${path}.columns[${c}][${i}]`);
        if (e) return e;
      }
    }
    return null;
  }

  if (blockType === 'footer') {
    const e = validateProps(props, BLOCK_PROPS.footer, ['links'], path);
    if (e) return e;
    if (isRecord(props) && props.links !== undefined) {
      if (!Array.isArray(props.links)) {
        return `${path}: "links" debe ser un array`;
      }
      const links = props.links as unknown[];
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (
          !isRecord(link) ||
          typeof link.label !== 'string' ||
          typeof link.href !== 'string'
        ) {
          return `${path}.links[${i}] debe tener label y href (texto)`;
        }
      }
    }
    return null;
  }

  return validateProps(props, BLOCK_PROPS[blockType], [], path);
}

function validateTheme(theme: unknown): string | null {
  if (!isRecord(theme)) return 'la plantilla: "theme" debe ser un objeto';
  for (const [key, value] of Object.entries(theme)) {
    if (key === 'containerWidth') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 'la plantilla: "theme.containerWidth" debe ser un número';
      }
      continue;
    }
    if (!THEME_STRING_KEYS.has(key)) {
      return `la plantilla: clave de theme no reconocida "${key}"`;
    }
    if (typeof value !== 'string') {
      return `la plantilla: "theme.${key}" debe ser texto`;
    }
  }
  return null;
}

/** Valida una plantilla completa. Devuelve el primer error, o null si es válida. */
export function validateTemplate(value: unknown): string | null {
  if (!isRecord(value)) return 'la plantilla debe ser un objeto';
  for (const key of Object.keys(value)) {
    if (key !== 'theme' && key !== 'blocks') {
      return `la plantilla: clave no reconocida "${key}"`;
    }
  }
  if (value.theme !== undefined) {
    const e = validateTheme(value.theme);
    if (e) return e;
  }
  if (!Array.isArray(value.blocks)) {
    return 'la plantilla debe tener un array "blocks"';
  }
  for (let i = 0; i < value.blocks.length; i++) {
    const e = validateBlock(value.blocks[i], `blocks[${i}]`);
    if (e) return e;
  }
  return null;
}
