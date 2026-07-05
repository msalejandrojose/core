import type { FieldDescriptor } from './field-descriptor';
import { validateFields } from './validate-fields';

const fields: FieldDescriptor[] = [
  {
    key: 'provider',
    label: 'P',
    type: 'select',
    options: ['resend'],
    required: true,
  },
  { key: 'fromEmail', label: 'E', type: 'email', required: true },
  { key: 'fromName', label: 'N', type: 'text' },
];

describe('validateFields', () => {
  it('acepta datos válidos', () => {
    expect(
      validateFields(fields, {
        provider: 'resend',
        fromEmail: 'a@b.com',
        fromName: 'X',
      }),
    ).toBeNull();
  });

  it('rechaza requeridos ausentes', () => {
    expect(validateFields(fields, { provider: 'resend' })).toMatch(/fromEmail/);
  });

  it('rechaza keys no reconocidas', () => {
    expect(
      validateFields(fields, {
        provider: 'resend',
        fromEmail: 'a@b.com',
        bogus: 1,
      }),
    ).toMatch(/bogus/);
  });

  it('valida formato email', () => {
    expect(
      validateFields(fields, { provider: 'resend', fromEmail: 'no-es-email' }),
    ).toMatch(/email/);
  });

  it('valida opciones de select', () => {
    expect(
      validateFields(fields, { provider: 'otro', fromEmail: 'a@b.com' }),
    ).toMatch(/provider/);
  });

  it('con allowTemplates no valida formato pero sí presencia', () => {
    const msg: FieldDescriptor[] = [
      { key: 'subject', label: 'S', type: 'text', required: true },
    ];
    expect(validateFields(msg, { subject: 'Hola {{ x }}' }, true)).toBeNull();
    expect(validateFields(msg, {}, true)).toMatch(/subject/);
  });
});
