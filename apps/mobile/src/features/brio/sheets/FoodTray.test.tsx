import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FoodTray } from './FoodTray';
import { trayTotals, type TrayItem } from './food-tray';

const item = (key: string, name: string, kcal: number, extra: Partial<TrayItem> = {}): TrayItem => ({
  key,
  foodId: key,
  name,
  quantityG: 100,
  kcal,
  proteinG: 10,
  carbsG: 20,
  fatG: 5,
  ...extra,
});

describe('FoodTray', () => {
  const items = [item('a', 'Pan de trigo', 250), item('b', 'Jamón serrano', 120, { quantityG: 30 })];

  it('lista lo elegido con su cantidad y kcal, y suma el total con macros', () => {
    render(<FoodTray title="Vas a añadir al desayuno" items={items} onRemove={vi.fn()} />);
    expect(screen.getByText('Pan de trigo')).toBeTruthy();
    expect(screen.getByText('30 g · 120 kcal')).toBeTruthy();
    expect(screen.getByLabelText('Total: 370 kcal').textContent).toContain('P 20 g');
  });

  it('la ✕ quita ese alimento y «Vaciar» lo quita todo', () => {
    const onRemove = vi.fn();
    const onClear = vi.fn();
    render(<FoodTray title="Bandeja" items={items} onRemove={onRemove} onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Jamón serrano' }));
    expect(onRemove).toHaveBeenCalledWith('b');
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('las kcal escritas a mano no enseñan gramos', () => {
    render(<FoodTray title="Bandeja" items={[item('t', 'Menú del día', 800, { foodId: null, quantityG: 1 })]} onRemove={vi.fn()} />);
    expect(screen.getByText('800 kcal')).toBeTruthy();
  });

  it('trayTotals suma kcal y macros', () => {
    expect(trayTotals(items)).toEqual({ kcal: 370, protein: 20, carbs: 40, fat: 10 });
  });
});
