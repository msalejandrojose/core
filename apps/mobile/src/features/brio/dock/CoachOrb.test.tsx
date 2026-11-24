import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({ apiClient: {} }));
import { useRegisterStore } from '../register.store';
import { CoachOrb } from './CoachOrb';
import { useDockStore } from './dock.store';

describe('el + de la barra', () => {
  afterEach(() => {
    useRegisterStore.getState().close();
    vi.useRealTimers();
  });

  const tap = () => {
    const btn = screen.getByRole('button', { name: /Registrar/ });
    fireEvent.pointerDown(btn, { clientY: 700, pointerId: 1 });
    window.dispatchEvent(new Event('pointerup'));
  };

  it('un toque abre «Registrar» sin teclado', () => {
    render(<CoachOrb tab="register" />);
    tap();
    expect(useRegisterStore.getState().sheet).toBe('menu');
    expect(useDockStore.getState().mode).toBe('idle');
  });

  it('otro toque la cierra', () => {
    render(<CoachOrb tab="register" />);
    tap();
    tap();
    expect(useRegisterStore.getState().sheet).toBeNull();
  });

  it('mantener pulsado habla con el coach en vez de abrir la hoja', () => {
    vi.useFakeTimers();
    const listen = vi.spyOn(useDockStore.getState(), 'startListening').mockResolvedValue();
    render(<CoachOrb tab="register" />);
    fireEvent.pointerDown(screen.getByRole('button', { name: /Registrar/ }), { clientY: 700, pointerId: 1 });
    vi.advanceTimersByTime(400);
    expect(listen).toHaveBeenCalled();
    expect(useRegisterStore.getState().sheet).toBeNull();
  });
});
