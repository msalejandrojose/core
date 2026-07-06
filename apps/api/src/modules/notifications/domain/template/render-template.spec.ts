import type { EmailTemplate } from './email-block';
import { renderTemplate } from './render-template';

describe('renderTemplate', () => {
  it('renderiza bloques a HTML email-safe (tablas + estilos inline)', () => {
    const template: EmailTemplate = {
      blocks: [
        { type: 'heading', props: { text: 'Bienvenida', level: 1 } },
        { type: 'text', props: { text: 'Cuerpo del email.' } },
        { type: 'button', props: { label: 'Entrar', href: 'https://x.test' } },
      ],
    };
    const { html } = renderTemplate(template);

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<table');
    expect(html).toContain('Bienvenida');
    expect(html).toContain('href="https://x.test"');
    // sin placeholders sin resolver
    expect(html).not.toContain('{{');
  });

  it('interpola {{ var }} en las props de texto', () => {
    const template: EmailTemplate = {
      blocks: [{ type: 'heading', props: { text: 'Hola {{ firstName }}' } }],
    };
    const { html, text } = renderTemplate(template, { firstName: 'Ana' });
    expect(html).toContain('Hola Ana');
    expect(text).toContain('Hola Ana');
  });

  it('escapa el HTML de las props para evitar inyección', () => {
    const template: EmailTemplate = {
      blocks: [{ type: 'text', props: { text: '<script>alert(1)</script>' } }],
    };
    const { html } = renderTemplate(template);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('genera una versión de texto plano legible', () => {
    const template: EmailTemplate = {
      blocks: [
        { type: 'hero', props: { title: 'Título', subtitle: 'Sub' } },
        { type: 'text', props: { text: 'Párrafo' } },
        { type: 'button', props: { label: 'Ir', href: 'https://x.test' } },
        { type: 'spacer', props: { size: 20 } },
        { type: 'footer', props: { text: 'Pie' } },
      ],
    };
    const { text } = renderTemplate(template);
    expect(text).toContain('Título');
    expect(text).toContain('Sub');
    expect(text).toContain('Párrafo');
    expect(text).toContain('Ir: https://x.test');
    expect(text).toContain('Pie');
  });

  it('renderiza columnas anidadas', () => {
    const template: EmailTemplate = {
      blocks: [
        {
          type: 'columns',
          props: {
            columns: [
              [{ type: 'text', props: { text: 'Izquierda' } }],
              [{ type: 'text', props: { text: 'Derecha' } }],
            ],
          },
        },
      ],
    };
    const { html, text } = renderTemplate(template);
    expect(html).toContain('Izquierda');
    expect(html).toContain('Derecha');
    expect(text).toContain('Izquierda');
    expect(text).toContain('Derecha');
  });

  it('aplica el tema (ancho de contenedor y acento)', () => {
    const template: EmailTemplate = {
      theme: { containerWidth: 480, accentColor: '#123456' },
      blocks: [
        { type: 'button', props: { label: 'X', href: 'https://x.test' } },
      ],
    };
    const { html } = renderTemplate(template);
    expect(html).toContain('width="480"');
    expect(html).toContain('#123456');
  });
});
