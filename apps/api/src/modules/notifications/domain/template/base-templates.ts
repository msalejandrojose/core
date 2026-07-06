import type { EmailTemplate } from './email-block';

// Librería de plantillas base reutilizables. Sirven como punto de partida al
// crear un `MessageType` de email: el backoffice las lista y copia sus bloques.
// Usan placeholders `{{ var }}` que se resuelven en el envío.

export interface BaseEmailTemplate {
  id: string;
  name: string;
  description: string;
  template: EmailTemplate;
}

export const BASE_EMAIL_TEMPLATES: readonly BaseEmailTemplate[] = [
  {
    id: 'transaccional',
    name: 'Transaccional',
    description:
      'Aviso transaccional con cabecera, cuerpo y un botón de acción. Ideal para confirmaciones y verificaciones.',
    template: {
      blocks: [
        { type: 'hero', props: { title: '{{ title }}' } },
        {
          type: 'text',
          props: { text: 'Hola {{ firstName }},' },
        },
        {
          type: 'text',
          props: { text: '{{ body }}' },
        },
        {
          type: 'button',
          props: { label: '{{ ctaLabel }}', href: '{{ ctaUrl }}' },
        },
        {
          type: 'footer',
          props: {
            text: 'Este correo se ha enviado automáticamente, no respondas a este mensaje.',
          },
        },
      ],
    },
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description:
      'Boletín con imagen destacada, titular, cuerpo y enlaces de pie. Pensado para comunicaciones periódicas.',
    template: {
      blocks: [
        {
          type: 'image',
          props: { src: '{{ heroImage }}', alt: '{{ title }}' },
        },
        { type: 'heading', props: { text: '{{ title }}', level: 1 } },
        { type: 'text', props: { text: '{{ intro }}' } },
        { type: 'divider', props: {} },
        { type: 'heading', props: { text: '{{ sectionTitle }}', level: 2 } },
        { type: 'text', props: { text: '{{ sectionBody }}' } },
        {
          type: 'button',
          props: { label: 'Leer más', href: '{{ readMoreUrl }}' },
        },
        {
          type: 'footer',
          props: {
            text: 'Recibes este email porque estás suscrito a nuestras novedades.',
            links: [{ label: 'Darse de baja', href: '{{ unsubscribeUrl }}' }],
          },
        },
      ],
    },
  },
  {
    id: 'aviso',
    name: 'Aviso',
    description:
      'Notificación breve de una sola sección, sin botón. Para avisos simples e informativos.',
    template: {
      blocks: [
        { type: 'heading', props: { text: '{{ title }}', level: 1 } },
        { type: 'text', props: { text: '{{ message }}' } },
        {
          type: 'footer',
          props: { text: '{{ signature }}' },
        },
      ],
    },
  },
];

export function findBaseEmailTemplate(
  id: string,
): BaseEmailTemplate | undefined {
  return BASE_EMAIL_TEMPLATES.find((t) => t.id === id);
}
