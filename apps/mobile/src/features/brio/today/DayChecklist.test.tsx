import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { DaySummary } from '../api';
import { DayChecklist } from './DayChecklist';

const summary = {
  day: '2026-11-24',
  meals: [
    { id: 'm1', mealType: 'BREAKFAST', name: 'Café con leche', kcal: 70 },
    { id: 'm2', mealType: 'BREAKFAST', name: 'Tostada con tomate', kcal: 180 },
    { id: 'm3', mealType: 'LUNCH', name: 'Lentejas', kcal: 450 },
  ],
  sessions: [
    {
      id: 's1',
      activityTypeName: 'Fútbol 7',
      kind: 'OTHER',
      durationSec: 3600,
      kcalBurned: 620,
      startedAt: '2026-11-24T19:00:00Z',
    },
  ],
} as unknown as DaySummary;

function renderList(props: Partial<Parameters<typeof DayChecklist>[0]> = {}) {
  return render(
    <MemoryRouter>
      <DayChecklist
        summary={summary}
        isToday
        pending={['SNACK', 'DINNER']}
        habitsByMeal={{}}
        plannedWorkout={null}
        timezone="Europe/Madrid"
        onAdd={vi.fn()}
        onAddWorkout={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('DayChecklist', () => {
  it('marca lo hecho con check y enseña qué fue', () => {
    renderList();
    const breakfast = screen.getByRole('button', { name: /Desayuno/ });
    expect(breakfast.className).toContain('is-done');
    expect(breakfast.textContent).toContain('Café con leche y tostada con tomate');
    expect(breakfast.textContent).toContain('250 kcal');
    expect(screen.getByText('Fútbol 7').closest('.today-day__row')?.className).toContain('is-done');
  });

  it('deja sin marcar lo que falta y cuenta lo hecho', () => {
    renderList();
    expect(screen.getByRole('button', { name: /Cena/ }).className).not.toContain('is-done');
    // Desayuno + comida + entreno de 4 comidas + entreno.
    expect(screen.getByLabelText('3 de 5 hechos')).toBeTruthy();
  });

  it('sin entreno ofrece el del plan', () => {
    renderList({ summary: { ...summary, sessions: [] }, plannedWorkout: 'Pierna' });
    expect(screen.getByRole('button', { name: /Entreno/ }).textContent).toContain('Toca: Pierna');
  });
});
