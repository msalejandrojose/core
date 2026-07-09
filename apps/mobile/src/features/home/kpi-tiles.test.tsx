import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KpiTiles } from './KpiTiles';
import { useDashboardSummary } from './use-dashboard-summary';

vi.mock('./use-dashboard-summary', () => ({
  useDashboardSummary: vi.fn(),
}));

const mockHook = useDashboardSummary as unknown as ReturnType<typeof vi.fn>;

describe('KpiTiles', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('muestra el skeleton mientras carga', () => {
    mockHook.mockReturnValue({ kpis: [], status: 'loading', reload: vi.fn() });
    render(<KpiTiles />);
    expect(screen.getByLabelText('Cargando indicadores…')).toBeInTheDocument();
  });

  it('pinta una tarjeta por KPI con el valor formateado', () => {
    mockHook.mockReturnValue({
      status: 'ready',
      reload: vi.fn(),
      kpis: [
        { slug: 'users', label: 'Usuarios', value: 12345, unit: 'count' },
        { slug: 'storage', label: 'Almacenamiento', value: 1024, unit: 'bytes' },
      ],
    });
    render(<KpiTiles />);
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    expect(screen.getByText('12.345')).toBeInTheDocument();
    expect(screen.getByText('Almacenamiento')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('Resumen')).toBeInTheDocument();
  });

  it('no pinta nada cuando el usuario no tiene KPIs', () => {
    mockHook.mockReturnValue({ kpis: [], status: 'ready', reload: vi.fn() });
    const { container } = render(<KpiTiles />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el estado de error con reintento', () => {
    const reload = vi.fn();
    mockHook.mockReturnValue({ kpis: [], status: 'error', reload });
    render(<KpiTiles />);
    expect(
      screen.getByText('No se pudieron cargar los indicadores.'),
    ).toBeInTheDocument();
    screen.getByText('Reintentar').click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
