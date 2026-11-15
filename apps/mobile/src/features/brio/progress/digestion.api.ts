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
  recent: BowelMovement[];
}

export const digestionApi = {
  view: (period: DigestionPeriod) =>
    call<DigestionView>('GET', '/brio/digestion', { params: { query: { period } } }),
  log: (body: { bristolType: number; amount: BowelAmount; occurredAt?: string }) =>
    call<BowelMovement>('POST', '/brio/digestion', { body }),
  remove: (id: string) => call<void>('DELETE', `/brio/digestion/${id}`),
};
