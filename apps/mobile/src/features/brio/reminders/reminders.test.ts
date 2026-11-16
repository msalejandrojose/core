import { describe, expect, it } from 'vitest';
import type { MealType } from '../api';
import { REMINDER_IDS, inQuietHours, planReminders, type ReminderInput } from './reminders';

// Lunes 16/11/2026 a las 13:00, hora local del dispositivo (como en el móvil).
const NOW = new Date(2026, 10, 16, 13, 0);
const ALL_ON = { comidas: true, cena: true, sesion: true, recup: true, peso: true, resumen: true };

const base = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  now: NOW,
  on: ALL_ON,
  loggedMeals: new Set<MealType>(['BREAKFAST']),
  kcalRemaining: 1200,
  today: { title: 'Fuerza · torso', startTime: '19:00', load: 'MEDIUM', done: false },
  tomorrow: { title: 'Series 6×800', startTime: '07:30', load: 'HIGH', done: false, dietKcal: 3200 },
  recovery: 70,
  ...over,
});

const byId = (specs: ReturnType<typeof planReminders>, id: number) => specs.find((s) => s.id === id);

describe('planReminders', () => {
  it('programa lo que falta del día, con sus horas', () => {
    const r = planReminders(base());
    expect(byId(r, REMINDER_IDS.comidasTarde)).toMatchObject({ title: '¿Te falta la comida?' });
    expect(byId(r, REMINDER_IDS.comidasTarde)!.at.getHours()).toBe(16);
    expect(byId(r, REMINDER_IDS.comidasNoche)!.title).toBe('Te falta la comida, la merienda y la cena');
    expect(byId(r, REMINDER_IDS.cena)).toMatchObject({
      title: 'Te quedan 1.200 kcal para cenar',
      body: 'Mañana toca Series 6×800: mejor con hidratos.',
    });
    const entreno = byId(r, REMINDER_IDS.entreno)!;
    expect([entreno.at.getHours(), entreno.at.getMinutes()]).toEqual([18, 30]);
    expect(byId(r, REMINDER_IDS.sesion)!.title).toBe('Mañana: Series 6×800 a las 07:30');
    // Ordenados por hora.
    expect(r.map((s) => s.at.getTime())).toEqual([...r.map((s) => s.at.getTime())].sort((a, b) => a - b));
  });

  it('lo ya registrado o hecho no se recuerda', () => {
    const r = planReminders(
      base({
        loggedMeals: new Set<MealType>(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']),
        today: { title: 'Fuerza', startTime: '19:00', load: 'MEDIUM', done: true },
      }),
    );
    expect(byId(r, REMINDER_IDS.comidasTarde)).toBeUndefined();
    expect(byId(r, REMINDER_IDS.comidasNoche)).toBeUndefined();
    expect(byId(r, REMINDER_IDS.cena)).toBeUndefined();
    expect(byId(r, REMINDER_IDS.entreno)).toBeUndefined();
  });

  it('respeta lo apagado en Avisos y no programa nada pasado', () => {
    const late = new Date(2026, 10, 16, 20, 45);
    const r = planReminders(base({ now: late, on: { ...ALL_ON, cena: false, peso: false, resumen: false } }));
    expect(r.map((s) => s.id)).toEqual([REMINDER_IDS.sesion, REMINDER_IDS.comidasNoche]);
  });

  it('peso el lunes a las 8 y resumen el domingo a las 20', () => {
    const r = planReminders(base());
    const peso = byId(r, REMINDER_IDS.peso)!.at;
    expect([peso.getDay(), peso.getDate(), peso.getHours()]).toEqual([1, 23, 8]);
    const resumen = byId(r, REMINDER_IDS.resumen)!.at;
    expect([resumen.getDay(), resumen.getDate(), resumen.getHours()]).toEqual([0, 22, 20]);
  });

  it('recuperación baja con carga alta: aviso enseguida', () => {
    const r = planReminders(base({ recovery: 38, today: { title: 'Series', startTime: null, load: 'HIGH', done: false } }));
    const rec = byId(r, REMINDER_IDS.recup)!;
    expect(rec.at.getTime()).toBe(NOW.getTime() + 60_000);
    // Sin hora prevista, el recordatorio del entreno va a las 18:00.
    expect(byId(r, REMINDER_IDS.entreno)!.at.getHours()).toBe(18);
  });

  it('no molesta de 23:00 a 7:30', () => {
    expect(inQuietHours(new Date(2026, 10, 16, 23, 10))).toBe(true);
    expect(inQuietHours(new Date(2026, 10, 16, 7, 15))).toBe(true);
    expect(inQuietHours(new Date(2026, 10, 16, 7, 30))).toBe(false);
    const r = planReminders(base({ today: { title: 'Rodaje', startTime: '07:00', load: 'LOW', done: false } }));
    expect(byId(r, REMINDER_IDS.entreno)).toBeUndefined();
  });
});
