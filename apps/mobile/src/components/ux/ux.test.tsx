import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { ErrorBoundary } from './ErrorBoundary';

describe('EmptyState', () => {
  it('muestra título y descripción', () => {
    render(<EmptyState title="Sin datos" description="Vuelve más tarde" />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.getByText('Vuelve más tarde')).toBeInTheDocument();
  });

  it('dispara la acción al pulsar el botón', () => {
    const onAction = vi.fn();
    render(
      <EmptyState title="Vacío" actionLabel="Recargar" onAction={onAction} />,
    );
    fireEvent.click(screen.getByText('Recargar'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorState', () => {
  it('muestra el botón de reintento solo si hay onRetry', () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState message="Ups" />);
    expect(screen.queryByText('Reintentar')).not.toBeInTheDocument();
    rerender(<ErrorState message="Ups" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorBoundary', () => {
  it('renderiza los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <span>contenido ok</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenido ok')).toBeInTheDocument();
  });

  it('captura un error de render y muestra la pantalla de recuperación', () => {
    // Silencia el console.error esperado del boundary durante el test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Boom(): never {
      throw new Error('boom');
    }
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo se ha roto')).toBeInTheDocument();
    spy.mockRestore();
  });
});
