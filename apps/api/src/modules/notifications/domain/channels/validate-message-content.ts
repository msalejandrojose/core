import type { NotificationChannel } from '@core/shared-types';
import { isNonEmptyTemplate } from '../template/email-block';
import { channelDefinition } from './channel-catalog';
import { validateFields } from './validate-fields';

// Validación del contenido de un tipo de mensaje. Combina la validación
// genérica por campos (`validateFields`) con reglas específicas de canal que no
// se pueden expresar como campos planos.
//
// Para EMAIL: el cuerpo puede venir como `html` directo o como `template` de
// bloques (que se compila a html en el envío), pero al menos uno debe existir.
export function validateMessageContent(
  channel: NotificationChannel,
  content: unknown,
  allowTemplates = false,
): string | null {
  const fields = channelDefinition(channel).message;
  const base = validateFields(fields, content, allowTemplates);
  if (base) return base;

  if (channel === 'EMAIL' && typeof content === 'object' && content !== null) {
    const c = content as Record<string, unknown>;
    const hasHtml = typeof c.html === 'string' && c.html.trim() !== '';
    const hasTemplate = isNonEmptyTemplate(c.template);
    if (!hasHtml && !hasTemplate) {
      return 'un email debe tener "html" o "template"';
    }
  }

  // WHATSAPP: o texto libre (`body`) o una plantilla aprobada (`templateName`).
  // La plantilla es el único modo que permite INICIAR una conversación en Meta.
  if (channel === 'WHATSAPP' && typeof content === 'object' && content !== null) {
    const c = content as Record<string, unknown>;
    const hasBody = typeof c.body === 'string' && c.body.trim() !== '';
    const hasTemplate =
      typeof c.templateName === 'string' && c.templateName.trim() !== '';
    if (!hasBody && !hasTemplate) {
      return 'un mensaje de WhatsApp debe tener "body" o "templateName"';
    }
  }

  return null;
}
