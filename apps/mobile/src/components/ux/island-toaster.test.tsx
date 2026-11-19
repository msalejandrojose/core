import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IslandToaster } from './IslandToaster';
import { toast, useIslandStore } from '@/lib/toast';

beforeEach(() => {
  vi.useFakeTimers();
  useIslandStore.setState({ current: null, queue: [], live: null });
});
afterEach(() => {
  act(() => useIslandStore.setState({ current: null, queue: [], live: null }));
  vi.useRealTimers();
});

const island = () => document.querySelector('.island') as HTMLElement;

describe('IslandToaster', () => {
  it('enseña el aviso y se cierra solo a su tiempo', () => {
    render(<IslandToaster />);
    act(() => void toast.success('Entreno guardado', '6 series · 412 kcal'));
    expect(screen.getByRole('status')).toHaveTextContent('Entreno guardado6 series · 412 kcal');
    act(() => vi.advanceTimersByTime(3500));
    expect(useIslandStore.getState().current).toBeNull();
  });

  it('«Deshacer» es un botón: lo ejecuta una vez y cierra el aviso', () => {
    const run = vi.fn();
    render(<IslandToaster />);
    act(() => void toast.undo('Comida apuntada', 'Almuerzo · 540 kcal', run, { tone: 'food', icon: 'food' }));
    expect(document.querySelector('.island__ring-arc')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(useIslandStore.getState().current?.title).not.toBe('Comida apuntada');
  });

  it('mantener pulsado congela el tiempo y el anillo', () => {
    render(<IslandToaster />);
    act(() => void toast.undo('Peso apuntado', undefined, () => {}));
    fireEvent.pointerDown(island());
    expect(document.querySelector('.island__ring-arc.is-paused')).not.toBeNull();
    act(() => vi.advanceTimersByTime(8000));
    expect(useIslandStore.getState().current?.title).toBe('Peso apuntado');
    fireEvent.pointerUp(island());
    act(() => vi.advanceTimersByTime(5000));
    expect(useIslandStore.getState().current).toBeNull();
  });

  it('el progreso no se cierra solo hasta que llega el resultado', () => {
    render(<IslandToaster />);
    let t!: ReturnType<typeof toast.progress>;
    act(() => {
      t = toast.progress('Guardando entreno…');
    });
    expect(screen.getByLabelText('En curso')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(useIslandStore.getState().current?.kind).toBe('loading');
    act(() => t.success('Entreno guardado'));
    expect(screen.getByRole('status')).toHaveTextContent('Entreno guardado');
    act(() => vi.advanceTimersByTime(3500));
    expect(useIslandStore.getState().current).toBeNull();
  });

  it('un error es «alert» y enseña «+1» si hay otro esperando', () => {
    render(<IslandToaster />);
    act(() => {
      toast.error('No se pudo guardar', 'Sin conexión.');
      toast.success('Cambios guardados');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar');
    expect(screen.getByLabelText('1 aviso más')).toHaveTextContent('+1');
  });

  it('tocar la isla cierra el aviso', () => {
    render(<IslandToaster />);
    act(() => void toast.info('Hola'));
    fireEvent.click(island());
    expect(useIslandStore.getState().current).toBeNull();
  });

  it('descanso en pequeño; al tocarlo se abre con «+15 s» y «Saltar»', () => {
    const onAdd = vi.fn();
    const onSkip = vi.fn();
    render(<IslandToaster />);
    act(() =>
      useIslandStore.getState().setLive({ kind: 'rest', until: Date.now() + 84_000, total: 90, next: 'Remo con barra', onAdd, onSkip }),
    );
    expect(island()).toHaveClass('is-compact');
    expect(screen.getByLabelText('Descanso, quedan 1:24. Toca para abrirlo.')).toBeInTheDocument();
    fireEvent.click(island());
    expect(island()).toHaveClass('is-open');
    fireEvent.click(screen.getByRole('button', { name: '+15 s' }));
    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(island()).toHaveClass('is-open');
  });

  it('un aviso tapa el descanso y, al irse, vuelve lo pequeño', () => {
    render(<IslandToaster />);
    act(() =>
      useIslandStore
        .getState()
        .setLive({ kind: 'workout', name: 'Torso A', startedAt: Date.now() - 60_000, done: 3, total: 10, volumeKg: 1720, onOpen: () => {} }),
    );
    act(() => void toast.success('Cambios guardados'));
    act(() => vi.advanceTimersByTime(50));
    expect(island()).toHaveClass('is-open');
    act(() => vi.advanceTimersByTime(3500));
    act(() => vi.advanceTimersByTime(420));
    expect(island()).toHaveClass('is-compact');
  });
});
