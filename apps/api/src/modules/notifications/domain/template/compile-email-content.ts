import { isNonEmptyTemplate } from './email-block';
import { renderTemplate } from './render-template';

// Puente entre el contenido de un `MessageType` de email y el motor de
// plantillas. Si el contenido trae un `template` con bloques, lo compila a
// `html` + `text` (la plantilla es la fuente). Si no, deja el contenido tal
// cual → retrocompatible con los mensajes que solo tienen `content.html`.

export function compileEmailContent(
  content: Record<string, unknown>,
  vars: Record<string, unknown>,
): Record<string, unknown> {
  const template = content.template;
  if (!isNonEmptyTemplate(template)) return content;

  const { html, text } = renderTemplate(template, vars);
  return { ...content, html, text };
}
