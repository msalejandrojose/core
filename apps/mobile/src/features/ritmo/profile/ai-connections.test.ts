import { describe, expect, it } from 'vitest';

import { relativeTime } from './ai-connections';

describe('relativeTime', () => {
  const now = new Date('2026-11-18T12:00:00Z').getTime();
  it('minutos, horas, ayer y fecha', () => {
    expect(relativeTime('2026-11-18T11:59:40Z', now)).toBe('ahora mismo');
    expect(relativeTime('2026-11-18T11:55:00Z', now)).toBe('hace 5 min');
    expect(relativeTime('2026-11-18T09:00:00Z', now)).toBe('hace 3 h');
    expect(relativeTime('2026-11-17T08:00:00Z', now)).toBe('ayer');
    expect(relativeTime('2026-11-12T10:00:00Z', now)).toBe('el 12 nov');
  });
});
