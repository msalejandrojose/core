import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormSchema } from '@core/forms';
import { useCoreForm } from './use-core-form';

const schema: FormSchema = {
  fields: [
    {
      type: 'text',
      name: 'name',
      label: 'Nombre',
      validations: [{ kind: 'required' }],
    },
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      validations: [{ kind: 'email' }],
    },
    // Solo visible (y por tanto validado) si `wantsInvoice` es verdadero.
    {
      type: 'text',
      name: 'taxId',
      label: 'NIF',
      validations: [{ kind: 'required' }],
      visibleWhen: { field: 'wantsInvoice', op: 'truthy' },
    },
    { type: 'checkbox', name: 'wantsInvoice', label: 'Quiero factura' },
  ],
};

describe('useCoreForm', () => {
  it('inicializa valores desde los defaults del schema', () => {
    const { result } = renderHook(() =>
      useCoreForm({ schema, onSubmit: vi.fn() }),
    );
    expect(result.current.values).toMatchObject({
      name: '',
      email: '',
      taxId: '',
      wantsInvoice: false,
    });
  });

  it('fusiona initialValues sobre los defaults', () => {
    const { result } = renderHook(() =>
      useCoreForm({
        schema,
        initialValues: { name: 'Ada' },
        onSubmit: vi.fn(),
      }),
    );
    expect(result.current.values.name).toBe('Ada');
  });

  it('no muestra errores hasta hacer blur o intentar enviar', () => {
    const { result } = renderHook(() =>
      useCoreForm({ schema, onSubmit: vi.fn() }),
    );
    expect(result.current.errors).toEqual({});
    act(() => result.current.blur('name'));
    expect(result.current.errors.name).toBeTruthy();
  });

  it('bloquea el submit cuando hay errores sync', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useCoreForm({ schema, onSubmit }));
    act(() => result.current.handleSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBeTruthy();
  });

  it('envía cuando el formulario es válido', async () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useCoreForm({ schema, initialValues: { name: 'Ada' }, onSubmit }),
    );
    act(() => result.current.handleSubmit());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ada' }),
    );
  });

  it('no valida campos ocultos por visibleWhen', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useCoreForm({ schema, initialValues: { name: 'Ada' }, onSubmit }),
    );
    // taxId es requerido pero está oculto (wantsInvoice = false) → no bloquea.
    act(() => result.current.handleSubmit());
    expect(result.current.errors.taxId).toBeUndefined();
  });

  it('valida un campo cuando su condición lo hace visible', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useCoreForm({ schema, initialValues: { name: 'Ada' }, onSubmit }),
    );
    act(() => result.current.setValue('wantsInvoice', true));
    act(() => result.current.handleSubmit());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.errors.taxId).toBeTruthy();
  });

  it('revalida en caliente tras el primer blur', () => {
    const { result } = renderHook(() =>
      useCoreForm({ schema, onSubmit: vi.fn() }),
    );
    act(() => result.current.blur('email'));
    act(() => result.current.setValue('email', 'no-es-email'));
    expect(result.current.errors.email).toBeTruthy();
    act(() => result.current.setValue('email', 'ada@example.com'));
    expect(result.current.errors.email).toBeUndefined();
  });

  it('ejecuta la validación async en el submit y bloquea si falla', async () => {
    const asyncSchema: FormSchema = {
      fields: [
        {
          type: 'username',
          name: 'username',
          label: 'Usuario',
          validations: [{ kind: 'async', ref: 'username-available' }],
        },
      ],
    };
    const onSubmit = vi.fn();
    const asyncValidator = vi.fn().mockResolvedValue('Ya está en uso');
    const { result } = renderHook(() =>
      useCoreForm({
        schema: asyncSchema,
        initialValues: { username: 'ada' },
        asyncValidator,
        onSubmit,
      }),
    );
    act(() => result.current.handleSubmit());
    await waitFor(() =>
      expect(asyncValidator).toHaveBeenCalledWith(
        'username-available',
        'ada',
        expect.any(Object),
      ),
    );
    await waitFor(() =>
      expect(result.current.errors.username).toBe('Ya está en uso'),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('reset vuelve a los valores iniciales y limpia errores', () => {
    const { result } = renderHook(() =>
      useCoreForm({ schema, onSubmit: vi.fn() }),
    );
    act(() => result.current.setValue('name', 'x'));
    act(() => result.current.blur('email'));
    act(() => result.current.reset());
    expect(result.current.values.name).toBe('');
    expect(result.current.errors).toEqual({});
  });
});
