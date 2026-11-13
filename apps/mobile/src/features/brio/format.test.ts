import { describe, expect, it } from 'vitest';
import {
  dayLabel,
  formatDistance,
  formatDuration,
  formatGrams,
  formatKcal,
  formatWeight,
  mealForHour,
  longDate,
  joinNames,
  formatNumber,
  ratio,
} from './format';

describe('formatKcal', () => {
  it('redondea a entero', () => {
    expect(formatKcal(1840.4)).toBe('1.840');
    expect(formatKcal(-412)).toBe('\u2212412');
    expect(formatKcal(0)).toBe('0');
  });
});

describe('formatGrams', () => {
  it('omite el decimal cuando es redondo', () => {
    expect(formatGrams(42)).toBe('42 g');
    expect(formatGrams(4.15)).toBe('4,2 g');
  });
});

describe('formatWeight', () => {
  it('siempre con un decimal', () => {
    expect(formatWeight(80)).toBe('80,0 kg');
    expect(formatWeight(80.44)).toBe('80,4 kg');
  });
});

describe('formatDuration', () => {
  it('usa minutos, horas o ambos', () => {
    expect(formatDuration(1800)).toBe('30 min');
    expect(formatDuration(7200)).toBe('2 h');
    expect(formatDuration(4800)).toBe('1 h 20 min');
  });
});

describe('formatDistance', () => {
  it('cambia a km a partir de 1000 m', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(5200)).toBe('5,2 km');
  });
});

describe('dayLabel', () => {
  const today = '2026-11-10';

  it('reconoce hoy y ayer', () => {
    expect(dayLabel('2026-11-10', today)).toBe('Hoy');
    expect(dayLabel('2026-11-09', today)).toBe('Ayer');
  });

  it('formatea el resto como día y mes abreviado', () => {
    expect(dayLabel('2026-11-08', today)).toBe('8 nov');
    expect(dayLabel('2026-01-31', today)).toBe('31 ene');
  });

  it('cruza el cambio de mes al calcular ayer', () => {
    expect(dayLabel('2026-10-31', '2026-11-01')).toBe('Ayer');
  });
});

describe('ratio', () => {
  it('acota entre 0 y 1', () => {
    expect(ratio(1000, 2000)).toBe(0.5);
    expect(ratio(3000, 2000)).toBe(1);
    expect(ratio(-5, 2000)).toBe(0);
  });

  it('sin objetivo no inventa progreso', () => {
    expect(ratio(1000, null)).toBe(0);
    expect(ratio(1000, 0)).toBe(0);
  });
});

describe('formatNumber', () => {
  it('agrupa siempre los miles y usa coma decimal', () => {
    expect(formatNumber(9140)).toBe('9.140');
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(74.2, 1)).toBe('74,2');
  });

  it('usa el menos tipográfico y no deja un −0', () => {
    expect(formatNumber(-0.4, 1)).toBe('\u22120,4');
    expect(formatNumber(-0.01, 1)).toBe('0,0');
  });
});

describe('mealForHour', () => {
  it('propone la comida que toca según la hora', () => {
    expect(mealForHour(8)).toBe('BREAKFAST');
    expect(mealForHour(14)).toBe('LUNCH');
    expect(mealForHour(17)).toBe('SNACK');
    expect(mealForHour(21)).toBe('DINNER');
  });
});

describe('longDate', () => {
  it('escribe el día de la semana y el mes en español', () => {
    expect(longDate('2026-11-11')).toBe('miércoles, 11 de noviembre');
  });
});

describe('joinNames', () => {
  it('une como se diría en español', () => {
    expect(joinNames(['Huevo entero'])).toBe('Huevo entero');
    expect(joinNames(['Huevo entero', 'Pan de trigo'])).toBe('Huevo entero y pan de trigo');
    expect(joinNames(['Avena', 'Leche', 'Plátano'])).toBe('Avena, leche y plátano');
  });
});
