import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({ apiClient: {} }));
const bench = {
  id: 'e1',
  code: 'bench_press',
  name: 'Press de banca',
  isBodyweight: false,
  ownerUserId: null,
  customized: false,
  muscles: [{ muscle: 'CHEST', weight: 1 }],
  description: 'Tumbado en un banco plano, bajas una barra hasta el pecho.',
  steps: ['Túmbate con los ojos bajo la barra.'],
};
vi.mock('../performance/perf.api', () => ({ perfApi: { exercises: () => Promise.resolve([bench]) } }));
// La ficha completa (animación, evolución) no hace falta aquí: basta con su contenido y la acción.
vi.mock('../exercise-guide/ExerciseGuide', () => ({
  ExerciseGuideSheet: ({ exercise, action }: { exercise: typeof bench | null; action?: { label: string; onClick: (e: typeof bench) => void } }) =>
    exercise ? (
      <div role="dialog">
        <p>{exercise.description}</p>
        {action ? <button onClick={() => action.onClick(exercise)}>{action.label}</button> : null}
      </div>
    ) : null,
}));

import { ExercisePicker } from './ExercisePicker';

describe('ExercisePicker', () => {
  it('ⓘ abre la ficha del ejercicio sin añadirlo', async () => {
    const onPick = vi.fn();
    render(<ExercisePicker onPick={onPick} onCancel={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver cómo se hace Press de banca' }));
    expect(screen.getByRole('dialog').textContent).toContain('bajas una barra hasta el pecho');
    expect(onPick).not.toHaveBeenCalled();
  });

  it('«Añadir» en la ficha lo añade y la cierra', async () => {
    const onPick = vi.fn();
    render(<ExercisePicker onPick={onPick} onCancel={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver cómo se hace Press de banca' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    expect(onPick).toHaveBeenCalledWith(bench);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('tocar la fila lo añade directamente, como antes', async () => {
    const onPick = vi.fn();
    render(<ExercisePicker onPick={onPick} onCancel={vi.fn()} />);
    fireEvent.click(await screen.findByText('Press de banca'));
    expect(onPick).toHaveBeenCalledWith(bench);
  });
});
