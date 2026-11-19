import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({ apiClient: {} }));
import { fireEvent, render, screen } from '@testing-library/react';
import { perfApi } from '../performance/perf.api';
import { ExerciseProgress } from './ExerciseProgress';

const point = (day: string, topWeightKg: number, totalReps: number) => ({
  day,
  e1rm: null,
  volumeKg: topWeightKg * totalReps,
  topWeightKg,
  maxReps: 10,
  totalReps,
  workingSets: 4,
});

const history = vi.spyOn(perfApi, 'exerciseHistory');

describe('evolución de un ejercicio', () => {
  beforeEach(() => history.mockReset());

  it('enseña la última sesión, el cambio de carga y los dos gráficos; el periodo se puede cambiar', async () => {
    history.mockResolvedValue({
      exerciseId: 'x',
      analysis: { history: [point('2026-09-01', 52, 40), point('2026-10-01', 59, 40), point('2026-11-17', 66, 38)] } as never,
    });
    render(<ExerciseProgress exerciseId="x" isBodyweight={false} />);
    expect(await screen.findByText('Carga más alta (kg)')).toBeInTheDocument();
    expect(screen.getByText('Repeticiones por sesión')).toBeInTheDocument();
    expect(screen.getByText('Última sesión')).toBeInTheDocument();
    expect(screen.getByText('66 kg')).toBeInTheDocument();
    expect(screen.getByText(/\+14 kg de carga en 3 meses · 3 sesiones/)).toBeInTheDocument();
    expect(history).toHaveBeenLastCalledWith('x', '90d');

    fireEvent.click(screen.getByRole('button', { name: '1 año' }));
    expect(history).toHaveBeenLastCalledWith('x', '1y');
    expect(await screen.findByText(/en un año/)).toBeInTheDocument();
  });

  it('la tabla da los mismos datos sin depender del gráfico', async () => {
    history.mockResolvedValue({
      exerciseId: 'x',
      analysis: { history: [point('2026-11-10', 60, 40), point('2026-11-17', 66, 38)] } as never,
    });
    render(<ExerciseProgress exerciseId="x" isBodyweight={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver como tabla' }));
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1].textContent).toContain('66 kg');
  });

  it('en peso corporal sin lastre solo hay gráfico de repeticiones', async () => {
    history.mockResolvedValue({
      exerciseId: 'x',
      analysis: { history: [point('2026-11-10', 0, 30), point('2026-11-17', 0, 34)] } as never,
    });
    render(<ExerciseProgress exerciseId="x" isBodyweight />);
    expect(await screen.findByText('Repeticiones por sesión')).toBeInTheDocument();
    expect(screen.queryByText('Carga más alta (kg)')).not.toBeInTheDocument();
  });

  it('sin series todavía, lo explica', async () => {
    history.mockResolvedValue({ exerciseId: 'x', analysis: null });
    render(<ExerciseProgress exerciseId="x" isBodyweight={false} />);
    expect(await screen.findByText(/Aún no has registrado este ejercicio/)).toBeInTheDocument();
  });
});
