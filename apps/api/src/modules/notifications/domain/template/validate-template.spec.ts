import { BASE_EMAIL_TEMPLATES } from './base-templates';
import { validateTemplate } from './validate-template';

describe('validateTemplate', () => {
  it('acepta una plantilla válida', () => {
    expect(
      validateTemplate({
        theme: { containerWidth: 600, accentColor: '#000' },
        blocks: [
          { type: 'heading', props: { text: 'Hola', level: 2 } },
          { type: 'button', props: { label: 'Ir', href: 'https://x.test' } },
        ],
      }),
    ).toBeNull();
  });

  it('acepta props con placeholders {{ var }}', () => {
    expect(
      validateTemplate({
        blocks: [{ type: 'text', props: { text: 'Hola {{ name }}' } }],
      }),
    ).toBeNull();
  });

  it('rechaza si no es un objeto', () => {
    expect(validateTemplate([])).toMatch(/objeto/);
    expect(validateTemplate(null)).toMatch(/objeto/);
  });

  it('rechaza claves no reconocidas en la plantilla', () => {
    expect(validateTemplate({ blocks: [], bogus: 1 })).toMatch(/bogus/);
  });

  it('exige un array blocks', () => {
    expect(validateTemplate({})).toMatch(/blocks/);
  });

  it('rechaza tipos de bloque no soportados', () => {
    expect(
      validateTemplate({ blocks: [{ type: 'carousel', props: {} }] }),
    ).toMatch(/no soportado/);
  });

  it('exige props requeridas del bloque', () => {
    expect(
      validateTemplate({ blocks: [{ type: 'button', props: {} }] }),
    ).toMatch(/label/);
  });

  it('rechaza props no reconocidas del bloque', () => {
    expect(
      validateTemplate({
        blocks: [{ type: 'text', props: { text: 'x', bogus: 1 } }],
      }),
    ).toMatch(/bogus/);
  });

  it('valida columnas recursivamente', () => {
    expect(
      validateTemplate({
        blocks: [
          {
            type: 'columns',
            props: { columns: [[{ type: 'button', props: {} }]] },
          },
        ],
      }),
    ).toMatch(/label/);
  });

  it('valida los links del footer', () => {
    expect(
      validateTemplate({
        blocks: [{ type: 'footer', props: { links: [{ label: 'x' }] } }],
      }),
    ).toMatch(/links/);
  });

  it('todas las plantillas base son válidas', () => {
    for (const base of BASE_EMAIL_TEMPLATES) {
      expect(validateTemplate(base.template)).toBeNull();
    }
  });
});
