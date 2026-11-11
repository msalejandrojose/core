import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Snackbar } from './Snackbar';
import { SNACKBAR_MS, snackbar, useSnackbarStore } from '@/lib/snackbar';

afterEach(() => {
  useSnackbarStore.setState({ current: null });
  vi.useRealTimers();
});

describe('Snackbar', () => {
  it('muestra el mensaje y ejecuta Deshacer una sola vez', () => {
    const undo = vi.fn();
    render(<Snackbar />);
    act(() => snackbar.undo('Cena registrada · 620 kcal', undo));

    expect(screen.getByRole('status')).toHaveTextContent('Cena registrada · 620 kcal');
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));

    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('se retira solo pasado el tiempo', () => {
    vi.useFakeTimers();
    render(<Snackbar />);
    act(() => snackbar.show('Peso guardado · 80,0 kg'));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(SNACKBAR_MS));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('un mensaje nuevo sustituye al anterior', () => {
    render(<Snackbar />);
    act(() => snackbar.show('Primero'));
    act(() => snackbar.show('Segundo'));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Segundo');
  });
});
