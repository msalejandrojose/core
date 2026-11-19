import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultDuration, priority, toast, useIslandStore } from './toast';
import { snackbar, splitMessage } from './snackbar';

const state = () => useIslandStore.getState();
const current = () => state().current;

describe('toast (isla)', () => {
  beforeEach(() => useIslandStore.setState({ current: null, queue: [], live: null }));

  it('enseña título, descripción y tipo, y devuelve su id', () => {
    const id = toast.success('Guardado', 'Todo correcto');
    expect(current()).toMatchObject({ id, kind: 'success', title: 'Guardado', description: 'Todo correcto' });
  });

  it('uno nuevo sustituye al visible si tiene al menos su prioridad', () => {
    toast.info('Uno');
    toast.warning('Dos');
    expect(current()?.title).toBe('Dos');
    expect(state().queue).toHaveLength(0);
  });

  it('un «hecho» no tapa un error: espera su turno y entra al quitarse el error', () => {
    toast.error('Falló');
    toast.success('Hecho');
    expect(current()?.title).toBe('Falló');
    expect(state().queue.map((t) => t.title)).toEqual(['Hecho']);
    toast.clear();
    expect(current()?.title).toBe('Hecho');
    expect(state().queue).toHaveLength(0);
  });

  it('la cola va por prioridad y guarda como mucho 3', () => {
    toast.error('E');
    toast.info('i1');
    toast.warning('w');
    toast.success('ok', undefined, { action: { label: 'Ver', run: () => {} } });
    toast.info('i2');
    expect(state().queue.map((t) => t.title)).toEqual(['ok', 'w', 'i1']);
  });

  it('duraciones por tipo y con acción; se pueden fijar', () => {
    expect(defaultDuration('success')).toBe(3500);
    expect(defaultDuration('warning')).toBe(4000);
    expect(defaultDuration('error')).toBe(5000);
    expect(defaultDuration('success', { action: { label: 'x', run: () => {} } })).toBe(5000);
    expect(defaultDuration('error', { action: { label: 'x', run: () => {} } })).toBe(6000);
    expect(defaultDuration('loading')).toBe(0);
    toast.success('Hecho', undefined, { duration: 1200 });
    expect(current()?.duration).toBe(1200);
  });

  it('prioridad: error > con acción o en curso > aviso > el resto', () => {
    expect(priority({ kind: 'error' })).toBe(3);
    expect(priority({ kind: 'loading' })).toBe(2);
    expect(priority({ kind: 'success', action: { label: 'x', run: () => {} } })).toBe(2);
    expect(priority({ kind: 'warning' })).toBe(1);
    expect(priority({ kind: 'info' })).toBe(0);
  });

  it('dismiss quita por id, también si está en la cola; clear, el visible', () => {
    toast.error('A');
    const b = toast.info('B');
    toast.dismiss(b);
    expect(state().queue).toHaveLength(0);
    toast.clear();
    expect(current()).toBeNull();
  });

  it('progreso: gira sin fin, avanza y se transforma en su resultado', () => {
    const t = toast.progress('Guardando entreno…', 'Torso A');
    expect(current()).toMatchObject({ kind: 'loading', duration: 0, version: 0 });
    t.progress(0.5, '6 de 12');
    expect(current()).toMatchObject({ progress: 0.5, description: '6 de 12', version: 1 });
    t.success('Entreno guardado', '6 series · 412 kcal', { icon: 'dumbbell' });
    expect(current()).toMatchObject({ id: t.id, kind: 'success', title: 'Entreno guardado', icon: 'dumbbell', duration: 3500, version: 2 });
    expect(current()?.progress).toBeUndefined();
  });

  it('progreso que falla: error con su acción', () => {
    const t = toast.progress('Guardando…');
    const retry = vi.fn();
    t.error('No se pudo guardar', 'Sin conexión.', { action: { label: 'Reintentar', run: retry } });
    expect(current()).toMatchObject({ kind: 'error', duration: 6000, action: { label: 'Reintentar' } });
  });

  it('deshacer: anillo, 5 s y, al deshacer, «Deshecho» o el texto que se pida', async () => {
    const run = vi.fn();
    toast.undo('Comida apuntada', 'Almuerzo · 540 kcal', run, { tone: 'food', undone: 'Comida quitada' });
    expect(current()).toMatchObject({ countdown: true, tone: 'food', duration: 5000, action: { label: 'Deshacer' } });
    await current()!.action!.run();
    expect(run).toHaveBeenCalledTimes(1);
    expect(current()).toMatchObject({ title: 'Comida quitada', duration: 2500 });
  });

  it('si deshacer falla, lo dice', async () => {
    toast.undo('Peso apuntado', undefined, () => Promise.reject(new Error('x')));
    await current()!.action!.run();
    expect(current()).toMatchObject({ kind: 'error', title: 'No se pudo deshacer' });
  });
});

describe('snackbar → isla', () => {
  beforeEach(() => useIslandStore.setState({ current: null, queue: [], live: null }));

  it('parte «título · resto» en título y descripción', () => {
    expect(splitMessage('Almuerzo apuntado · 540 kcal')).toEqual({ title: 'Almuerzo apuntado', description: '540 kcal' });
    expect(splitMessage('Entreno registrado · ayer · 300 kcal')).toEqual({ title: 'Entreno registrado', description: 'ayer · 300 kcal' });
    expect(splitMessage('Sin separador')).toEqual({ title: 'Sin separador' });
  });

  it('undo sale de la isla con «Deshacer» y el tono pedido', () => {
    snackbar.undo('Cena apuntada · 620 kcal', () => {}, { tone: 'food', icon: 'food' });
    expect(current()).toMatchObject({ title: 'Cena apuntada', description: '620 kcal', tone: 'food', icon: 'food', countdown: true });
  });
});
