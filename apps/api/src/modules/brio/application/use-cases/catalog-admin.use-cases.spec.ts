import { cleanExercise, cleanFood } from './catalog-admin.use-cases';

const food = {
  name: ' Pan integral ',
  brand: ' ',
  barcode: null,
  isVerified: true,
  isLiquid: false,
  kcalPer100: 250,
  proteinPer100G: 9,
  carbsPer100G: 43,
  fatPer100G: 3.5,
  servings: [],
};

describe('catálogos del backoffice', () => {
  it('alimento: limpia textos y pone «100 g» si no hay raciones', () => {
    const f = cleanFood(food);
    expect(f.name).toBe('Pan integral');
    expect(f.brand).toBeNull();
    expect(f.servings).toEqual([
      { label: '100 g', grams: 100, isDefault: true },
    ]);
  });

  it('alimento: los macros no pueden dar más kcal de la cuenta', () => {
    expect(() => cleanFood({ ...food, kcalPer100: 50 })).toThrow(
      'BRIO_FOOD_MACROS_EXCEED_KCAL',
    );
  });

  it('alimento: una sola ración por defecto y sin etiquetas repetidas', () => {
    const f = cleanFood({
      ...food,
      servings: [
        { label: '1 rebanada', grams: 30, isDefault: true },
        { label: '1 barra', grams: 250, isDefault: true },
      ],
    });
    expect(f.servings.map((s) => s.isDefault)).toEqual([true, false]);
    expect(() =>
      cleanFood({
        ...food,
        servings: [
          { label: 'X', grams: 1, isDefault: true },
          { label: 'x', grams: 2, isDefault: false },
        ],
      }),
    ).toThrow('BRIO_FOOD_SERVING_DUPLICATED');
  });

  it('ejercicio: músculos válidos, sin repetir y con uno principal', () => {
    const base = {
      code: ' Press_X ',
      name: 'Press X',
      measure: 'REPS' as const,
      isCompound: true,
      isBodyweight: false,
      isArchived: false,
    };
    expect(
      cleanExercise({ ...base, muscles: [{ muscle: 'CHEST', weight: 1 }] })
        .code,
    ).toBe('press_x');
    expect(() =>
      cleanExercise({ ...base, muscles: [{ muscle: 'CHEST', weight: 0.5 }] }),
    ).toThrow('BRIO_EXERCISE_PRIMARY_MUSCLE_REQUIRED');
    expect(() =>
      cleanExercise({ ...base, muscles: [{ muscle: 'NECK', weight: 1 }] }),
    ).toThrow('BRIO_EXERCISE_MUSCLES_INVALID');
    expect(() =>
      cleanExercise({
        ...base,
        muscles: [
          { muscle: 'CHEST', weight: 1 },
          { muscle: 'CHEST', weight: 0.5 },
        ],
      }),
    ).toThrow('BRIO_EXERCISE_MUSCLES_INVALID');
  });
});
