import { vi, describe, expect, it } from 'vitest';

// La ficha arrastra el cliente de la API, que exige VITE_API_URL; aquí no se llama.
vi.mock('@/api/client', () => ({ apiClient: {} }));
import { render, screen } from '@testing-library/react';
import type { Exercise } from '../performance/perf.api';
import { ExerciseGuide } from './ExerciseGuide';

const base: Exercise = {
  id: 'e1',
  code: 'good_morning',
  name: 'Good morning con barra',
  isBodyweight: false,
  description: 'Con la barra sobre la espalda, inclinas el torso hacia delante.',
  steps: ['Apoya la barra sobre los trapecios.', 'Lleva la cadera hacia atrás.'],
  ownerUserId: null,
  customized: false,
  muscles: [
    { muscle: 'HAMSTRINGS', weight: 1 },
    { muscle: 'LOWER_BACK', weight: 1 },
    { muscle: 'GLUTES', weight: 0.5 },
  ],
};

describe('ficha de un ejercicio', () => {
  it('muestra la animación, la descripción, los pasos y lo que trabaja', () => {
    render(<ExerciseGuide exercise={base} />);
    expect(screen.getByRole('button', { name: /Animación de cómo se hace: Good morning con barra/ })).toBeInTheDocument();
    expect(screen.getByText(/inclinas el torso hacia delante/)).toBeInTheDocument();
    const steps = screen.getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual(base.steps);
    expect(screen.getByText('Isquiotibiales, Lumbar')).toBeInTheDocument();
    expect(screen.getByText(/También: Glúteos/)).toBeInTheDocument();
  });

  it('en un ejercicio propio, sin animación ni texto, lo explica', () => {
    render(
      <ExerciseGuide
        exercise={{ ...base, code: null, ownerUserId: 'u1', description: null, steps: [], name: 'Mi invento' }}
      />,
    );
    expect(screen.queryByRole('button', { name: /Animación/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Es un ejercicio tuyo/)).toBeInTheDocument();
    expect(screen.queryByText('Cómo se hace')).not.toBeInTheDocument();
  });

  it('con «reducir movimiento», enseña quietas la posición de inicio y la final', () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...original(q), matches: q.includes('reduce') })) as typeof window.matchMedia;
    try {
      render(<ExerciseGuide exercise={base} />);
      expect(screen.getByRole('img', { name: /Animación de cómo se hace/ })).toBeInTheDocument();
      expect(screen.getByText('Inicio')).toBeInTheDocument();
      expect(screen.getByText('Final')).toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });
});
