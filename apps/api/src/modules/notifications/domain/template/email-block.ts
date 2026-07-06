// Modelo de plantilla de email por bloques. Es el contrato de datos que guarda
// un `MessageType` de canal EMAIL en `content.template`: una lista ordenada de
// bloques reutilizables + un tema opcional. El motor (`render-template.ts`) lo
// compila a HTML email-safe (tablas + estilos inline) y a texto plano.
//
// Filosofía schema-driven, en la misma línea que el catálogo de canales y los
// formularios dinámicos: cada bloque declara su `type` y sus `props` tipadas. La
// validación server-side vive en `validate-template.ts`.

export type EmailBlockAlign = 'left' | 'center' | 'right';

/** Tokens visuales parametrizables por plantilla (con defaults en el motor). */
export interface EmailTheme {
  /** Familia tipográfica del cuerpo. */
  fontFamily?: string;
  /** Ancho del contenedor central, en px. */
  containerWidth?: number;
  /** Fondo exterior, alrededor del contenedor. */
  backgroundColor?: string;
  /** Fondo del contenedor de contenido. */
  contentBackgroundColor?: string;
  /** Color de texto por defecto. */
  textColor?: string;
  /** Color de acento (enlaces, botones). */
  accentColor?: string;
}

/** Banner de cabecera con título y subtítulo (opcionalmente sobre imagen). */
export interface HeroBlock {
  type: 'hero';
  props: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    backgroundColor?: string;
    textColor?: string;
    align?: EmailBlockAlign;
  };
}

export interface HeadingBlock {
  type: 'heading';
  props: { text: string; level?: 1 | 2 | 3; align?: EmailBlockAlign };
}

export interface TextBlock {
  type: 'text';
  props: { text: string; align?: EmailBlockAlign };
}

export interface ButtonBlock {
  type: 'button';
  props: {
    label: string;
    href: string;
    backgroundColor?: string;
    textColor?: string;
    align?: EmailBlockAlign;
  };
}

export interface ImageBlock {
  type: 'image';
  props: {
    src: string;
    alt?: string;
    href?: string;
    width?: number;
    align?: EmailBlockAlign;
  };
}

export interface DividerBlock {
  type: 'divider';
  props?: { color?: string };
}

export interface SpacerBlock {
  type: 'spacer';
  props?: { size?: number };
}

/** Fila de columnas (2 recomendado). Cada columna es una lista de bloques. */
export interface ColumnsBlock {
  type: 'columns';
  props: { columns: EmailBlock[][] };
}

export interface FooterBlock {
  type: 'footer';
  props: {
    text?: string;
    links?: { label: string; href: string }[];
    backgroundColor?: string;
    textColor?: string;
  };
}

export type EmailBlock =
  | HeroBlock
  | HeadingBlock
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | FooterBlock;

export type EmailBlockType = EmailBlock['type'];

/** Una plantilla completa: bloques ordenados + tema opcional. */
export interface EmailTemplate {
  theme?: EmailTheme;
  blocks: EmailBlock[];
}

export const EMAIL_BLOCK_TYPES: readonly EmailBlockType[] = [
  'hero',
  'heading',
  'text',
  'button',
  'image',
  'divider',
  'spacer',
  'columns',
  'footer',
];

/** true si el valor es una plantilla con al menos un bloque. */
export function isNonEmptyTemplate(value: unknown): value is EmailTemplate {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Array.isArray((value as { blocks?: unknown }).blocks) &&
    (value as { blocks: unknown[] }).blocks.length > 0
  );
}
