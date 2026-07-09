import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useOnline } from './use-online';

describe('useOnline', () => {
  it('refleja el estado inicial de navigator.onLine', () => {
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(navigator.onLine);
  });

  it('reacciona a los eventos online / offline', () => {
    const { result } = renderHook(() => useOnline());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
