import { CronParserClock } from './cron-parser.clock';

describe('CronParserClock', () => {
  const clock = new CronParserClock();

  it('calcula el próximo disparo diario en UTC', () => {
    const from = new Date('2026-07-04T12:00:00.000Z');
    const next = clock.next('0 9 * * *', from);
    expect(next.toISOString()).toBe('2026-07-05T09:00:00.000Z');
  });

  it('el próximo disparo es estrictamente posterior a `from`', () => {
    const from = new Date('2026-07-04T09:00:00.000Z');
    const next = clock.next('0 9 * * *', from);
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    expect(next.toISOString()).toBe('2026-07-05T09:00:00.000Z');
  });

  it('valida expresiones', () => {
    expect(clock.isValid('*/5 * * * *')).toBe(true);
    expect(clock.isValid('no soy un cron')).toBe(false);
    expect(clock.isValid('99 99 99 99 99')).toBe(false);
  });
});
