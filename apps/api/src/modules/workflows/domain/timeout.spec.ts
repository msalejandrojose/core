import { StepTimeoutError, withTimeout } from './timeout';

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('resuelve con el valor de `work` si termina antes del timeout', async () => {
    const result = withTimeout(Promise.resolve('ok'), 5);
    await expect(result).resolves.toBe('ok');
  });

  it('propaga el error de `work` si falla antes del timeout', async () => {
    const result = withTimeout(Promise.reject(new Error('boom')), 5);
    await expect(result).rejects.toThrow('boom');
  });

  it('rechaza con StepTimeoutError si `work` no termina a tiempo', async () => {
    const never = new Promise<string>(() => {});
    const result = withTimeout(never, 2);
    const assertion = expect(result).rejects.toBeInstanceOf(StepTimeoutError);
    await jest.advanceTimersByTimeAsync(2000);
    await assertion;
  });

  it('no deja timers colgados cuando `work` resuelve', async () => {
    await withTimeout(Promise.resolve(1), 30);
    expect(jest.getTimerCount()).toBe(0);
  });
});
