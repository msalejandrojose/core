import {
  MIN_DAILY_KCAL,
  ageFromBirthDate,
  basalMetabolicRate,
  computeEnergyTargets,
  dailyKcalTarget,
  macroTargets,
  scaleMacros,
  sessionKcal,
  totalDailyEnergyExpenditure,
} from './energy';

const TODAY = new Date('2026-11-10T12:00:00Z');

describe('ageFromBirthDate', () => {
  it('no cuenta el cumpleaños que aún no ha llegado este año', () => {
    expect(ageFromBirthDate('1990-12-01', TODAY)).toBe(35);
    expect(ageFromBirthDate('1990-11-10', TODAY)).toBe(36);
    expect(ageFromBirthDate('1990-01-01', TODAY)).toBe(36);
  });
});

describe('basalMetabolicRate', () => {
  // Mifflin-St Jeor: 10*80 + 6.25*180 - 5*30 + 5 = 1780
  it('aplica Mifflin-St Jeor con la constante de sexo', () => {
    const base = { weightKg: 80, heightCm: 180, age: 30 };
    expect(basalMetabolicRate({ ...base, sex: 'MALE' })).toBe(1780);
    expect(basalMetabolicRate({ ...base, sex: 'FEMALE' })).toBe(1614);
  });

  it('sin sexo informado usa la media de ambas constantes', () => {
    const bmr = basalMetabolicRate({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      sex: null,
    });
    expect(bmr).toBe(1697);
  });
});

describe('totalDailyEnergyExpenditure', () => {
  it('multiplica por el factor del nivel de actividad', () => {
    expect(totalDailyEnergyExpenditure(1780, 'SEDENTARY')).toBe(2136);
    expect(totalDailyEnergyExpenditure(1780, 'MODERATE')).toBe(2759);
  });
});

describe('dailyKcalTarget', () => {
  it('traduce kg/semana a déficit diario (7700 kcal por kg)', () => {
    // -0.5 kg/semana → -550 kcal/día
    expect(dailyKcalTarget(2500, -0.5)).toBe(1950);
    expect(dailyKcalTarget(2500, 0)).toBe(2500);
    expect(dailyKcalTarget(2500, 0.25)).toBe(2775);
  });

  it('acota el ritmo semanal a ±1 kg', () => {
    expect(dailyKcalTarget(3000, -5)).toBe(dailyKcalTarget(3000, -1));
  });

  it('nunca baja del suelo de kcal diarias', () => {
    expect(dailyKcalTarget(1500, -1)).toBe(MIN_DAILY_KCAL);
  });
});

describe('macroTargets', () => {
  it('fija proteína por peso, grasa por fracción de kcal y el resto a hidratos', () => {
    const m = macroTargets({
      kcalTarget: 2000,
      weightKg: 80,
      goal: 'LOSE_WEIGHT',
    });
    expect(m.proteinTargetG).toBe(160); // 2.0 g/kg
    expect(m.fatTargetG).toBe(56); // 25% de 2000 kcal / 9
    // 2000 - 160*4 - 56*9 = 856 kcal → 214 g
    expect(m.carbsTargetG).toBe(214);
  });

  it('recorta los hidratos a 0 en vez de devolver un plan imposible', () => {
    const m = macroTargets({
      kcalTarget: 1200,
      weightKg: 140,
      goal: 'LOSE_WEIGHT',
    });
    expect(m.carbsTargetG).toBe(0);
  });
});

describe('computeEnergyTargets', () => {
  const base = {
    weightKg: 80,
    heightCm: 180,
    birthDate: '1996-11-10',
    sex: 'MALE' as const,
    activityLevel: 'MODERATE' as const,
    goalType: 'LOSE_WEIGHT' as const,
    weeklyWeightChangeKg: null,
    today: TODAY,
  };

  it('calcula la cadena completa con el ritmo por defecto del objetivo', () => {
    const t = computeEnergyTargets(base);
    expect(t).not.toBeNull();
    expect(t!.weeklyWeightChangeKg).toBe(-0.5);
    expect(t!.bmrKcal).toBe(1780);
    expect(t!.tdeeKcal).toBe(2759);
    expect(t!.dailyKcalTarget).toBe(2209);
  });

  it('devuelve null si falta peso, altura o fecha de nacimiento', () => {
    expect(computeEnergyTargets({ ...base, weightKg: null })).toBeNull();
    expect(computeEnergyTargets({ ...base, heightCm: null })).toBeNull();
    expect(computeEnergyTargets({ ...base, birthDate: null })).toBeNull();
  });
});

describe('sessionKcal', () => {
  it('aplica MET × 3.5 × kg / 200 por minuto', () => {
    // 8 MET, 80 kg, 30 min → 8*3.5*80/200 = 11.2 kcal/min → 336
    expect(
      sessionKcal({ met: 8, weightKg: 80, durationSec: 1800, effort: null }),
    ).toBe(336);
  });

  it('ajusta por esfuerzo percibido cuando se indica', () => {
    const input = { met: 8, weightKg: 80, durationSec: 1800 };
    expect(sessionKcal({ ...input, effort: 'LIGHT' })).toBe(286);
    expect(sessionKcal({ ...input, effort: 'MODERATE' })).toBe(336);
    expect(sessionKcal({ ...input, effort: 'VIGOROUS' })).toBe(386);
  });
});

describe('scaleMacros', () => {
  it('escala los valores por 100 g a la cantidad consumida', () => {
    const per100 = {
      kcalPer100: 52,
      proteinPer100G: 0.3,
      carbsPer100G: 14,
      fatPer100G: 0.2,
    };
    expect(scaleMacros(per100, 150)).toEqual({
      kcal: 78,
      proteinG: 0.5,
      carbsG: 21,
      fatG: 0.3,
    });
  });
});
