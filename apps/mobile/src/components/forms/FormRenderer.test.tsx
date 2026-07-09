import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import type { FormSchema, FormValues } from '@core/forms';
import { getDefaultValues } from '@core/forms';
import { FormRenderer } from './FormRenderer';

const schema: FormSchema = {
  fields: [
    { type: 'heading', level: 2, text: 'Datos' },
    { type: 'text', name: 'name', label: 'Nombre' },
    {
      type: 'select',
      name: 'role',
      label: 'Rol',
      options: [{ value: 'a', label: 'Admin' }],
    },
    { type: 'toggle', name: 'active', label: 'Activo' },
    // Campo oculto por condición: no debe renderizarse.
    {
      type: 'text',
      name: 'secret',
      label: 'Secreto',
      visibleWhen: { field: 'active', op: 'truthy' },
    },
  ],
};

/** Harness mínimo: mantiene los valores en estado local. */
function Harness({ initial }: { initial?: FormValues }) {
  const [values, setValues] = useState<FormValues>(() => ({
    ...getDefaultValues(schema),
    ...initial,
  }));
  return (
    <FormRenderer
      schema={schema}
      values={values}
      errors={{}}
      setValue={(name, v) => setValues((prev) => ({ ...prev, [name]: v }))}
      blur={vi.fn()}
    />
  );
}

describe('FormRenderer', () => {
  it('renderiza labels, encabezado y controles sin romper', () => {
    render(<Harness />);
    expect(screen.getByText('Datos')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
    expect(screen.getByText('Rol')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('respeta la visibilidad condicional (campo oculto no se pinta)', () => {
    render(<Harness />);
    expect(screen.queryByText('Secreto')).not.toBeInTheDocument();
  });

  it('muestra el campo condicional cuando la condición se cumple', () => {
    render(<Harness initial={{ active: true }} />);
    expect(screen.getByText('Secreto')).toBeInTheDocument();
  });
});
