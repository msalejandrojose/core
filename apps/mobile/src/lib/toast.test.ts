import { beforeEach, describe, expect, it } from 'vitest';
import { toast, useIslandStore } from './toast';

const current = () => useIslandStore.getState().current;

describe('toast (isla)', () => {
  beforeEach(() => useIslandStore.setState({ current: null }));

  it('enseña título, descripción y tipo, y devuelve su id', () => {
    const id = toast.success('Guardado', 'Todo correcto');
    expect(current()).toMatchObject({ id, kind: 'success', title: 'Guardado', description: 'Todo correcto' });
  });

  it('uno nuevo sustituye al anterior', () => {
    toast.info('Uno');
    toast.warning('Dos');
    expect(current()?.title).toBe('Dos');
    expect(current()?.kind).toBe('warning');
  });

  it('los errores duran más y la duración se puede fijar', () => {
    toast.error('Falló');
    expect(current()?.duration).toBe(5000);
    toast.success('Hecho', undefined, { duration: 1200 });
    expect(current()?.duration).toBe(1200);
  });

  it('dismiss solo quita el aviso con ese id; clear, el que haya', () => {
    const a = toast.info('A');
    const b = toast.info('B');
    toast.dismiss(a);
    expect(current()?.id).toBe(b);
    toast.clear();
    expect(current()).toBeNull();
  });
});
