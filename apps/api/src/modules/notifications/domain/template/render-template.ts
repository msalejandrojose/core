import { renderContent } from './render-content';
import type {
  EmailBlock,
  EmailBlockAlign,
  EmailTemplate,
  EmailTheme,
} from './email-block';

// Motor de render de plantillas de email. Compila una lista de bloques a:
//   - HTML email-safe (tablas + estilos inline, compatible con Gmail/Outlook).
//   - Una versión en texto plano autogenerada.
//
// Puro y sin dependencias de framework. Reutiliza el interpolador `{{ var }}`
// del módulo (`renderContent`) para resolver las props de texto contra las
// variables ya resueltas que llegan al envío.

type ResolvedTheme = Required<EmailTheme>;

const DEFAULT_THEME: ResolvedTheme = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  containerWidth: 600,
  backgroundColor: '#f4f4f5',
  contentBackgroundColor: '#ffffff',
  textColor: '#1f2937',
  accentColor: '#e2725b',
};

function resolveTheme(theme?: EmailTheme): ResolvedTheme {
  return { ...DEFAULT_THEME, ...(theme ?? {}) };
}

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapa una URL para usarla en un atributo href/src. */
function escUrl(value: string | undefined): string {
  return esc(value);
}

function align(a: EmailBlockAlign | undefined): EmailBlockAlign {
  return a === 'left' || a === 'right' ? a : a === 'center' ? 'center' : 'left';
}

function td(inner: string, style: string): string {
  return `<tr><td style="${style}">${inner}</td></tr>`;
}

function renderBlockRow(block: EmailBlock, theme: ResolvedTheme): string {
  const pad = 'padding:12px 24px;';
  switch (block.type) {
    case 'hero': {
      const p = block.props;
      const bg = p.backgroundColor ?? theme.accentColor;
      const color = p.textColor ?? '#ffffff';
      const a = align(p.align ?? 'center');
      const image = p.imageUrl
        ? `<img src="${escUrl(p.imageUrl)}" alt="" width="72" style="display:block;margin:0 auto 16px;border:0;" />`
        : '';
      const subtitle = p.subtitle
        ? `<p style="margin:8px 0 0;font-size:16px;line-height:1.5;opacity:0.9;">${esc(p.subtitle)}</p>`
        : '';
      return td(
        `${image}<h1 style="margin:0;font-size:26px;line-height:1.3;">${esc(p.title)}</h1>${subtitle}`,
        `padding:40px 24px;text-align:${a};background:${bg};color:${color};`,
      );
    }
    case 'heading': {
      const p = block.props;
      const level = p.level === 2 || p.level === 3 ? p.level : 1;
      const size = level === 1 ? 22 : level === 2 ? 18 : 16;
      const a = align(p.align);
      return td(
        `<h${level} style="margin:0;font-size:${size}px;line-height:1.35;color:${theme.textColor};">${esc(p.text)}</h${level}>`,
        `${pad}text-align:${a};`,
      );
    }
    case 'text': {
      const p = block.props;
      const a = align(p.align);
      return td(
        `<p style="margin:0;font-size:15px;line-height:1.6;color:${theme.textColor};">${esc(p.text)}</p>`,
        `${pad}text-align:${a};`,
      );
    }
    case 'button': {
      const p = block.props;
      const bg = p.backgroundColor ?? theme.accentColor;
      const color = p.textColor ?? '#ffffff';
      const a = align(p.align ?? 'center');
      const anchor = `<a href="${escUrl(p.href)}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;">${esc(p.label)}</a>`;
      return td(anchor, `${pad}text-align:${a};`);
    }
    case 'image': {
      const p = block.props;
      const a = align(p.align ?? 'center');
      const width = p.width ? ` width="${p.width}"` : '';
      let img = `<img src="${escUrl(p.src)}" alt="${esc(p.alt ?? '')}"${width} style="display:inline-block;max-width:100%;border:0;" />`;
      if (p.href) img = `<a href="${escUrl(p.href)}">${img}</a>`;
      return td(img, `${pad}text-align:${a};`);
    }
    case 'divider': {
      const color = block.props?.color ?? '#e5e7eb';
      return td(
        `<div style="border-top:1px solid ${color};font-size:0;line-height:0;">&nbsp;</div>`,
        'padding:8px 24px;',
      );
    }
    case 'spacer': {
      const size = block.props?.size ?? 24;
      return td(
        '&nbsp;',
        `padding:0;font-size:0;line-height:0;height:${size}px;`,
      );
    }
    case 'columns': {
      const cols = block.props.columns;
      const width = Math.floor(100 / Math.max(cols.length, 1));
      const cells = cols
        .map(
          (col) =>
            `<td width="${width}%" valign="top" style="padding:0 8px;">${renderBlocksTable(col, theme)}</td>`,
        )
        .join('');
      return td(
        `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tbody><tr>${cells}</tr></tbody></table>`,
        'padding:12px 16px;',
      );
    }
    case 'footer': {
      const p = block.props;
      const bg = p.backgroundColor ?? '#f9fafb';
      const color = p.textColor ?? '#6b7280';
      const links = (p.links ?? [])
        .map(
          (l) =>
            `<a href="${escUrl(l.href)}" style="color:${color};text-decoration:underline;margin:0 8px;">${esc(l.label)}</a>`,
        )
        .join('');
      const text = p.text
        ? `<p style="margin:0 0 8px;">${esc(p.text)}</p>`
        : '';
      return td(
        `${text}${links}`,
        `padding:24px;text-align:center;background:${bg};color:${color};font-size:13px;line-height:1.5;`,
      );
    }
  }
}

function renderBlocksTable(blocks: EmailBlock[], theme: ResolvedTheme): string {
  const rows = blocks.map((b) => renderBlockRow(b, theme)).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tbody>${rows}</tbody></table>`;
}

function renderHtml(template: EmailTemplate, theme: ResolvedTheme): string {
  const rows = template.blocks.map((b) => renderBlockRow(b, theme)).join('');
  return (
    '<!doctype html><html><head><meta charset="utf-8" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" /></head>' +
    `<body style="margin:0;padding:0;background:${theme.backgroundColor};">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${theme.backgroundColor};">` +
    '<tbody><tr><td align="center" style="padding:24px 12px;">' +
    `<table role="presentation" cellpadding="0" cellspacing="0" width="${theme.containerWidth}" ` +
    `style="width:${theme.containerWidth}px;max-width:100%;background:${theme.contentBackgroundColor};` +
    `border-radius:8px;overflow:hidden;font-family:${theme.fontFamily};color:${theme.textColor};">` +
    `<tbody>${rows}</tbody></table>` +
    '</td></tr></tbody></table></body></html>'
  );
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function blockText(block: EmailBlock, lines: string[]): void {
  switch (block.type) {
    case 'hero':
      lines.push(stripTags(block.props.title));
      if (block.props.subtitle) lines.push(stripTags(block.props.subtitle));
      break;
    case 'heading':
    case 'text':
      lines.push(stripTags(block.props.text));
      break;
    case 'button':
      lines.push(`${stripTags(block.props.label)}: ${block.props.href}`);
      break;
    case 'image':
      if (block.props.alt) lines.push(stripTags(block.props.alt));
      break;
    case 'divider':
      lines.push('---');
      break;
    case 'spacer':
      break;
    case 'columns':
      for (const col of block.props.columns) {
        for (const b of col) blockText(b, lines);
      }
      break;
    case 'footer':
      if (block.props.text) lines.push(stripTags(block.props.text));
      for (const l of block.props.links ?? []) {
        lines.push(`${stripTags(l.label)}: ${l.href}`);
      }
      break;
  }
}

function renderText(template: EmailTemplate): string {
  const lines: string[] = [];
  for (const b of template.blocks) blockText(b, lines);
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n\n');
}

/**
 * Compila una plantilla de bloques a HTML email-safe + texto plano.
 *
 * `vars` interpola los placeholders `{{ var }}` de las props de texto. Es
 * idempotente respecto a `renderContent`: si las props ya vienen resueltas, un
 * segundo paso no cambia nada.
 */
export function renderTemplate(
  template: EmailTemplate,
  vars: Record<string, unknown> = {},
): { html: string; text: string } {
  const resolved = renderContent(template, vars);
  const theme = resolveTheme(resolved.theme);
  return {
    html: renderHtml(resolved, theme),
    text: renderText(resolved),
  };
}
