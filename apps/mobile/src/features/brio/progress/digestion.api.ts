import { call } from '../api';

/** Contrato de `/brio/digestion`. */

export type BowelAmount = 'SMALL' | 'NORMAL' | 'LARGE';
export type DigestionPeriod = 'WEEK' | 'MONTH' | 'YEAR';

export interface BowelMovement {
  id: string;
  occurredAt: string;
  loggedOn: string;
  bristolType: number;
  amount: BowelAmount;
}

export interface DigestionView {
  period: DigestionPeriod;
  summary: {
    days: number;
    count: number;
    perDay: number;
    normalPct: number | null;
    byType: number[];
    daysWithout: number;
  };
  /** Días del periodo con alguna: veces y tipo que dominó. */
  days: { day: string; count: number; mainType: number }[];
  recent: BowelMovement[];
}

export const digestionApi = {
  view: (period: DigestionPeriod) =>
    call<DigestionView>('GET', '/brio/digestion', { params: { query: { period } } }),
  log: (body: { bristolType: number; amount: BowelAmount; occurredAt?: string }) =>
    call<BowelMovement>('POST', '/brio/digestion', { body }),
  remove: (id: string) => call<void>('DELETE', `/brio/digestion/${id}`),
};

/** Aviso de que cambió algo (p. ej. se apuntó desde el +), para refrescar la pantalla. */
export const DIGESTION_CHANGED = 'brio:digestion-changed';
export const notifyDigestionChanged = () => window.dispatchEvent(new Event(DIGESTION_CHANGED));
