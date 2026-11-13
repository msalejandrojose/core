import { useCallback, useEffect, useState } from 'react';
import { call } from '../api';
import { formatNumber } from '../format';

/** Contrato de `/ritmo/recovery`: una estimación orientativa, no un diagnóstico. */

export type RecoveryLevel = 'GOOD' | 'MODERATE' | 'LOW';
export type FactorKey = 'SLEEP' | 'HRV' | 'RESTING_HR' | 'LOAD';
export type OptionId = 'KEEP' | 'EASY' | 'MOVE' | 'REST';

export interface RecoveryFactor {
  key: FactorKey;
  value: number | null;
  deltaPct: number | null;
  points: number;
  good: boolean;
}

export interface RecoveryOption {
  id: OptionId;
  recommended: boolean;
  templateCode: string | null;
  kcalDelta: number;
}

export interface RecoveryView {
  score: number | null;
  level: RecoveryLevel | null;
  factors: RecoveryFactor[];
  limiting: FactorKey | null;
  today: string;
  hasHealthData: boolean;
  load: { status: string; ratio: number | null; weekChangePct: number | null };
  tomorrow: { day: string; kind: string; title: string; load: string; plannedDurationMin: number | null } | null;
  options: RecoveryOption[];
}

export const recoveryApi = {
  get: () => call<RecoveryView>('GET', '/ritmo/recovery'),
  apply: (option: OptionId) => call<RecoveryView>('POST', '/ritmo/recovery/apply', { body: { option } }),
};

export function useRecovery() {
  const [data, setData] = useState<RecoveryView | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    recoveryApi
      .get()
      .then((r) => alive && (setData(r), setError(false)))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, setData, error, reload };
}

export const LEVEL_LABEL: Record<RecoveryLevel, string> = { GOOD: 'Buena', MODERATE: 'Moderada', LOW: 'Baja' };
export const LEVEL_COLOR: Record<RecoveryLevel, string> = {
  GOOD: 'var(--ritmo-activity)',
  MODERATE: 'var(--ritmo-food)',
  LOW: 'var(--ritmo-danger)',
};

const LIMITING_TEXT: Record<FactorKey, string> = {
  SLEEP: 'Has dormido menos de lo que sueles: es lo que más pesa hoy.',
  HRV: 'Tu variabilidad cardíaca está por debajo de tu media: tu cuerpo aún se está recuperando.',
  RESTING_HR: 'Tu pulso en reposo está más alto de lo normal para ti.',
  LOAD: 'Vienes de más carga de entrenamiento de la habitual.',
};

/** Una frase que explica la puntuación con el factor que más resta. */
export function recoveryMessage(r: RecoveryView): string {
  if (r.score === null) return 'Aún no hay datos suficientes. Registra entrenos o conecta tu reloj.';
  if (r.limiting) return LIMITING_TEXT[r.limiting];
  return r.level === 'GOOD' ? 'Todo está en tu media o mejor: llegas fresco.' : 'Nada destaca para mal: estás en tu línea habitual.';
}

const LOAD_STATUS: Record<string, string> = {
  WELL_ABOVE_USUAL: 'Muy alta',
  ABOVE_USUAL: 'Alta',
  USUAL: 'Habitual',
  BELOW_USUAL: 'Baja',
  WELL_BELOW_USUAL: 'Muy baja',
  INSUFFICIENT_DATA: 'Sin historial',
};

const hoursMinutes = (sec: number) => `${Math.floor(sec / 3600)} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;
function pct(value: number | null): string {
  if (value === null) return '—';
  const n = Math.round(value);
  return n === 0 ? 'Igual' : `${n > 0 ? '+' : '−'}${Math.abs(n)} %`;
}

/** Nombre, valor y variación de cada factor, listos para pintar. Los que no tienen dato se omiten. */
export function factorRows(r: RecoveryView): { key: FactorKey; name: string; value: string; delta: string; good: boolean }[] {
  const rows = r.factors.map((f) => {
    if (f.key === 'LOAD')
      return r.load.status === 'INSUFFICIENT_DATA'
        ? null
        : { key: f.key, name: 'Carga 7 días', value: LOAD_STATUS[r.load.status] ?? '—', delta: pct(f.deltaPct), good: f.good };
    if (f.value === null) return null;
    const value = f.key === 'SLEEP' ? hoursMinutes(f.value) : f.key === 'HRV' ? `${formatNumber(f.value)} ms` : `${formatNumber(f.value)} lpm`;
    const name = f.key === 'SLEEP' ? 'Sueño' : f.key === 'HRV' ? 'VFC' : 'FC en reposo';
    return { key: f.key, name, value, delta: f.deltaPct === null ? 'Sin media aún' : pct(f.deltaPct), good: f.good };
  });
  return rows.filter((x) => x !== null);
}

const EASY_TITLE: Record<string, string> = { z2: 'Rodaje suave 35 min', bici: 'Bici suave', mov: 'Movilidad' };

/** Título y explicación de una propuesta, con lo que cambia la dieta del día. */
export function optionText(o: RecoveryOption, r: RecoveryView): { title: string; desc: string } {
  const session = r.tomorrow?.title ?? 'la sesión';
  const diet = o.kcalDelta ? ` · dieta ${o.kcalDelta > 0 ? '+' : '−'}${formatNumber(Math.abs(o.kcalDelta))} kcal` : '';
  if (o.id === 'EASY') return { title: EASY_TITLE[o.templateCode ?? ''] ?? 'Sesión suave', desc: `En vez de ${session}${diet}` };
  if (o.id === 'MOVE') return { title: 'Moverla un día', desc: `${session} pasa a pasado mañana${diet}` };
  if (o.id === 'REST') return { title: 'Descansar', desc: `Sin entrenamiento mañana${diet}` };
  return { title: 'Mantener el plan', desc: `${session} como estaba` };
}
