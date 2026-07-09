import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from './toast';
import { sileo } from 'sileo';

vi.mock('sileo', () => ({
  sileo: {
    success: vi.fn(() => 'id-1'),
    error: vi.fn(() => 'id-2'),
    info: vi.fn(() => 'id-3'),
    warning: vi.fn(() => 'id-4'),
    dismiss: vi.fn(),
    clear: vi.fn(),
  },
}));

const s = sileo as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('toast', () => {
  beforeEach(() => {
    Object.values(s).forEach((fn) => fn.mockClear());
  });

  it('success pasa título y descripción a sileo y devuelve el id', () => {
    const id = toast.success('Guardado', 'Todo correcto');
    expect(s.success).toHaveBeenCalledWith({
      title: 'Guardado',
      description: 'Todo correcto',
    });
    expect(id).toBe('id-1');
  });

  it('error funciona sin descripción', () => {
    toast.error('No se pudo guardar');
    expect(s.error).toHaveBeenCalledWith({
      title: 'No se pudo guardar',
      description: undefined,
    });
  });

  it('info y warning delegan en su método correspondiente', () => {
    toast.info('Info');
    toast.warning('Cuidado');
    expect(s.info).toHaveBeenCalledOnce();
    expect(s.warning).toHaveBeenCalledOnce();
  });

  it('permite opciones extra de Sileo', () => {
    toast.success('Hecho', undefined, { position: 'bottom-center', duration: 5000 });
    expect(s.success).toHaveBeenCalledWith({
      title: 'Hecho',
      description: undefined,
      position: 'bottom-center',
      duration: 5000,
    });
  });

  it('dismiss y clear delegan en sileo', () => {
    toast.dismiss('id-1');
    toast.clear();
    expect(s.dismiss).toHaveBeenCalledWith('id-1');
    expect(s.clear).toHaveBeenCalledOnce();
  });
});
