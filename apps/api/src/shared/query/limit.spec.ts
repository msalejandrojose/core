import { Limit } from './limit';

describe('Limit', () => {
  it('valores básicos', () => {
    const l = new Limit(20, 10);
    expect(l.take).toBe(20);
    expect(l.skip).toBe(10);
  });

  it('skip default = 0', () => {
    const l = new Limit(20);
    expect(l.skip).toBe(0);
  });

  it('rechaza take negativo', () => {
    expect(() => new Limit(-1)).toThrow();
  });

  it('rechaza skip negativo', () => {
    expect(() => new Limit(10, -5)).toThrow();
  });

  it('Limit.page(1, 20) → take=20 skip=0', () => {
    const l = Limit.page(1, 20);
    expect(l.take).toBe(20);
    expect(l.skip).toBe(0);
  });

  it('Limit.page(3, 20) → take=20 skip=40', () => {
    const l = Limit.page(3, 20);
    expect(l.take).toBe(20);
    expect(l.skip).toBe(40);
  });

  it('Limit.page rechaza page < 1', () => {
    expect(() => Limit.page(0, 20)).toThrow();
  });

  it('Limit.page rechaza size < 1', () => {
    expect(() => Limit.page(1, 0)).toThrow();
  });
});
