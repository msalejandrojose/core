import { fireEvent, render, renderHook, screen, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FormSchema } from '@core/forms';
import { EntityDetail } from './EntityDetail';
import { useDetailMode } from '@/lib/use-detail-mode';

// Schema mínimo sin validaciones: así `handleSubmit` no se bloquea y podemos
// verificar el guardado con los valores por defecto.
const schema: FormSchema = {
  fields: [{ type: 'text', name: 'name', label: 'Nombre' }],
};

describe('useDetailMode', () => {
  it('arranca en el modo indicado y alterna edit/view', () => {
    const { result } = renderHook(() => useDetailMode('view'));
    expect(result.current.mode).toBe('view');
    expect(result.current.isEditable).toBe(false);

    act(() => result.current.enterEdit());
    expect(result.current.mode).toBe('edit');
    expect(result.current.isEditable).toBe(true);

    act(() => result.current.enterView());
    expect(result.current.mode).toBe('view');
  });

  it('create es editable', () => {
    const { result } = renderHook(() => useDetailMode('create'));
    expect(result.current.mode).toBe('create');
    expect(result.current.isEditable).toBe(true);
  });
});

describe('EntityDetail', () => {
  it('en modo view muestra el título y la acción Editar', () => {
    render(
      <EntityDetail
        schema={schema}
        values={{ name: 'Ada' }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Detalle')).toBeInTheDocument();
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });

  it('entra a edición al pulsar Editar y ofrece Cancelar/Guardar', () => {
    render(
      <EntityDetail
        schema={schema}
        values={{ name: 'Ada' }}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Editar'));
    expect(screen.getByText('Editar')).toBeInTheDocument(); // el título "Editar"
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('cancelar una edición vuelve a modo view', () => {
    render(
      <EntityDetail
        schema={schema}
        values={{ name: 'Ada' }}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByText('Cancelar'));
    // Vuelve a view: la acción Editar reaparece y Guardar desaparece.
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.queryByText('Guardar')).not.toBeInTheDocument();
  });

  it('guarda en modo edición y vuelve a view al resolver', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <EntityDetail
        schema={schema}
        values={{ name: 'Ada' }}
        initialMode="edit"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada' }, 'edit'),
    );
    // Tras guardar, vuelve a view.
    await waitFor(() =>
      expect(screen.getByText('Editar')).toBeInTheDocument(),
    );
  });

  it('en modo create muestra Crear y guarda con modo create', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<EntityDetail schema={schema} isCreate onSubmit={onSubmit} />);

    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Crear'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: '' }, 'create'),
    );
  });

  it('cancelar un alta invoca onCancel', () => {
    const onCancel = vi.fn();
    render(
      <EntityDetail
        schema={schema}
        isCreate
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('muestra skeleton mientras carga una entidad existente', () => {
    render(
      <EntityDetail schema={schema} status="loading" onSubmit={vi.fn()} />,
    );
    expect(screen.getByLabelText('Cargando…')).toBeInTheDocument();
  });

  it('muestra estado de error con reintento', () => {
    const onRetry = vi.fn();
    render(
      <EntityDetail
        schema={schema}
        status="error"
        onSubmit={vi.fn()}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('permanece en edición si el guardado rechaza', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));
    render(
      <EntityDetail
        schema={schema}
        values={{ name: 'Ada' }}
        initialMode="edit"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    // Sigue en edición: Guardar continúa visible, no vuelve a Editar.
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });
});
