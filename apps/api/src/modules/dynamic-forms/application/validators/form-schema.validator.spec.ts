import { validateFormSchema } from './form-schema.validator';

const okField = { key: 'nombre', type: 'text', label: 'Nombre' };

function schema(fields: unknown[]) {
  return { version: 1, fields };
}

describe('validateFormSchema', () => {
  it('acepta un schema válido con varios tipos', () => {
    expect(
      validateFormSchema(
        schema([
          { key: 'nombre', type: 'text', minLength: 2, maxLength: 50 },
          { key: 'email', type: 'email', required: true },
          { key: 'edad', type: 'number', min: 0, max: 120, step: 1 },
          { key: 'bio', type: 'textarea', rows: 4 },
          {
            key: 'pais',
            type: 'select',
            options: [
              { value: 'es', label: 'España' },
              { value: 'pt', label: 'Portugal' },
            ],
          },
          { key: 'acepta', type: 'checkbox', required: true },
        ]),
      ),
    ).toBeNull();
  });

  it('rechaza schema que no es objeto', () => {
    expect(validateFormSchema(null)).toMatch(/objeto/);
    expect(validateFormSchema([])).toMatch(/objeto/);
  });

  it('exige version numérica y fields array', () => {
    expect(validateFormSchema({ fields: [] })).toMatch(/version/);
    expect(validateFormSchema({ version: 1 })).toMatch(/fields/);
  });

  it('rechaza key vacía, con espacios o duplicada', () => {
    expect(validateFormSchema(schema([{ key: '', type: 'text' }]))).toMatch(
      /key/,
    );
    expect(validateFormSchema(schema([{ key: 'a b', type: 'text' }]))).toMatch(
      /espacios/,
    );
    expect(validateFormSchema(schema([okField, { ...okField }]))).toMatch(
      /únicos/,
    );
  });

  it('rechaza tipo no soportado', () => {
    expect(validateFormSchema(schema([{ key: 'x', type: 'file' }]))).toMatch(
      /no es un tipo soportado/,
    );
  });

  it('exige opciones válidas en campos de selección', () => {
    expect(validateFormSchema(schema([{ key: 'x', type: 'select' }]))).toMatch(
      /options/,
    );
    expect(
      validateFormSchema(schema([{ key: 'x', type: 'radio', options: [] }])),
    ).toMatch(/al menos una/);
    expect(
      validateFormSchema(
        schema([
          {
            key: 'x',
            type: 'select',
            options: [
              { value: 'a', label: 'A' },
              { value: 'a', label: 'B' },
            ],
          },
        ]),
      ),
    ).toMatch(/duplicados/);
    expect(
      validateFormSchema(
        schema([
          { key: 'x', type: 'select', options: [{ value: '', label: 'A' }] },
        ]),
      ),
    ).toMatch(/value/);
  });

  it('valida coherencia de longitudes y regex en campos de texto', () => {
    expect(
      validateFormSchema(
        schema([{ key: 'x', type: 'text', minLength: 5, maxLength: 2 }]),
      ),
    ).toMatch(/minLength no puede ser mayor/);
    expect(
      validateFormSchema(schema([{ key: 'x', type: 'text', minLength: -1 }])),
    ).toMatch(/minLength/);
    expect(
      validateFormSchema(schema([{ key: 'x', type: 'text', pattern: '(' }])),
    ).toMatch(/regular/);
  });

  it('valida coherencia numérica', () => {
    expect(
      validateFormSchema(
        schema([{ key: 'x', type: 'number', min: 10, max: 5 }]),
      ),
    ).toMatch(/min no puede ser mayor/);
    expect(
      validateFormSchema(schema([{ key: 'x', type: 'number', step: 0 }])),
    ).toMatch(/step/);
  });

  it('valida rows del textarea', () => {
    expect(
      validateFormSchema(schema([{ key: 'x', type: 'textarea', rows: 0 }])),
    ).toMatch(/rows/);
  });
});
