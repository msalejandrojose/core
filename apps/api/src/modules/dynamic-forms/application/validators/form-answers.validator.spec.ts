import { validateFormAnswers } from './form-answers.validator';
import type { PersistedFormSchema } from './field-spec';

const schema: PersistedFormSchema = {
  version: 1,
  fields: [
    {
      key: 'nombre',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 10,
    },
    { key: 'email', type: 'email', required: true },
    { key: 'edad', type: 'number', min: 18, max: 99 },
    { key: 'bio', type: 'textarea' },
    { key: 'acepta', type: 'checkbox', required: true },
    {
      key: 'pais',
      type: 'select',
      options: [
        { value: 'es', label: 'España' },
        { value: 'pt', label: 'Portugal' },
      ],
    },
    {
      key: 'idiomas',
      type: 'multiselect',
      options: [
        { value: 'es', label: 'Español' },
        { value: 'en', label: 'Inglés' },
      ],
    },
    { key: 'fecha', type: 'date' },
  ],
};

const valid = {
  nombre: 'Ana',
  email: 'ana@example.com',
  edad: 30,
  bio: 'hola',
  acepta: true,
  pais: 'es',
  idiomas: ['es', 'en'],
  fecha: '2026-01-15',
};

describe('validateFormAnswers', () => {
  it('acepta respuestas correctas', () => {
    const res = validateFormAnswers(schema, valid);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual({});
  });

  it('rechaza answers que no son objeto', () => {
    expect(validateFormAnswers(schema, null).valid).toBe(false);
    expect(validateFormAnswers(schema, []).valid).toBe(false);
  });

  it('exige campos obligatorios', () => {
    const res = validateFormAnswers(schema, { ...valid, nombre: '  ' });
    expect(res.valid).toBe(false);
    expect(res.errors['nombre']).toMatch(/obligatorio/);
  });

  it('exige marcar los checkbox obligatorios', () => {
    const res = validateFormAnswers(schema, { ...valid, acepta: false });
    expect(res.errors['acepta']).toMatch(/casilla/);
  });

  it('valida longitudes de texto', () => {
    expect(
      validateFormAnswers(schema, { ...valid, nombre: 'a' }).errors['nombre'],
    ).toMatch(/al menos 2/);
    expect(
      validateFormAnswers(schema, { ...valid, nombre: 'abcdefghijk' }).errors[
        'nombre'
      ],
    ).toMatch(/superar los 10/);
  });

  it('valida formato de email', () => {
    expect(
      validateFormAnswers(schema, { ...valid, email: 'no-es-email' }).errors[
        'email'
      ],
    ).toMatch(/email/);
  });

  it('valida rango numérico y coacciona strings numéricos', () => {
    expect(
      validateFormAnswers(schema, { ...valid, edad: 10 }).errors['edad'],
    ).toMatch(/mayor o igual que 18/);
    expect(validateFormAnswers(schema, { ...valid, edad: '30' }).valid).toBe(
      true,
    );
    expect(
      validateFormAnswers(schema, { ...valid, edad: 'x' }).errors['edad'],
    ).toMatch(/número/);
  });

  it('valida pertenencia de opciones en select y multiselect', () => {
    expect(
      validateFormAnswers(schema, { ...valid, pais: 'fr' }).errors['pais'],
    ).toMatch(/no es válida/);
    expect(
      validateFormAnswers(schema, { ...valid, idiomas: ['es', 'fr'] }).errors[
        'idiomas'
      ],
    ).toMatch(/no válida/);
    expect(
      validateFormAnswers(schema, { ...valid, idiomas: ['es', 'es'] }).errors[
        'idiomas'
      ],
    ).toMatch(/repetidas/);
  });

  it('valida formato de fecha', () => {
    expect(
      validateFormAnswers(schema, { ...valid, fecha: '15/01/2026' }).errors[
        'fecha'
      ],
    ).toMatch(/YYYY-MM-DD/);
  });

  it('permite omitir campos opcionales vacíos', () => {
    const res = validateFormAnswers(schema, {
      nombre: 'Ana',
      email: 'ana@example.com',
      acepta: true,
    });
    expect(res.valid).toBe(true);
  });

  it('ignora keys desconocidas en answers', () => {
    const res = validateFormAnswers(schema, { ...valid, extra: 'ignórame' });
    expect(res.valid).toBe(true);
  });
});
