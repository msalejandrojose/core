import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { IonItem } from '@ionic/react';
import { describe, expect, it, vi } from 'vitest';
import { CursorList } from './CursorList';
import { useCursorList, type CursorPage } from './use-cursor-list';

/** Helper: construye una página con el envelope del API. */
function page<T>(data: T[], nextCursor: string | null): CursorPage<T> {
  return {
    data,
    meta: { limit: 20, nextCursor, hasMore: nextCursor !== null },
  };
}

/** Firma del fetcher, para tipar los mocks encadenados de `vi.fn`. */
type Fetcher = (p: {
  cursor: string | null;
  limit: number;
}) => Promise<CursorPage<string> | null>;

describe('useCursorList', () => {
  it('carga la primera página al montar', async () => {
    const fetcher = vi.fn(async () => page(['a', 'b'], 'cur-2'));
    const { result } = renderHook(() => useCursorList(fetcher));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.items).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(true);
    expect(fetcher).toHaveBeenCalledWith({ cursor: null, limit: 20 });
  });

  it('concatena la siguiente página con loadMore y agota el cursor', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(page(['a'], 'cur-2'))
      .mockResolvedValueOnce(page(['b'], null));
    const { result } = renderHook(() => useCursorList<string>(fetcher));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toEqual(['a', 'b']);
    expect(result.current.hasMore).toBe(false);
    expect(fetcher).toHaveBeenLastCalledWith({ cursor: 'cur-2', limit: 20 });
  });

  it('loadMore es no-op cuando no hay página siguiente', async () => {
    const fetcher = vi.fn(async () => page(['a'], null));
    const { result } = renderHook(() => useCursorList(fetcher));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('reload vuelve a pedir desde la primera página', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValueOnce(page(['a'], null))
      .mockResolvedValueOnce(page(['x', 'y'], null));
    const { result } = renderHook(() => useCursorList<string>(fetcher));
    await waitFor(() => expect(result.current.items).toEqual(['a']));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.items).toEqual(['x', 'y']);
  });

  it('marca error cuando el fetcher devuelve null', async () => {
    const fetcher = vi.fn(async () => null);
    const { result } = renderHook(() => useCursorList<string>(fetcher));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('marca error cuando el fetcher lanza', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useCursorList<string>(fetcher));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('no carga al montar si immediate es false', () => {
    const fetcher = vi.fn(async () => page(['a'], null));
    const { result } = renderHook(() =>
      useCursorList(fetcher, { immediate: false }),
    );
    expect(result.current.status).toBe('ready');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('permite mutación optimista con setItems', async () => {
    const fetcher = vi.fn(async () => page(['a', 'b'], null));
    const { result } = renderHook(() => useCursorList<string>(fetcher));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => {
      result.current.setItems((prev) => prev.filter((x) => x !== 'a'));
    });

    expect(result.current.items).toEqual(['b']);
  });
});

describe('CursorList', () => {
  const noop = () => {};

  it('muestra skeletons mientras carga', () => {
    render(
      <CursorList
        items={[]}
        status="loading"
        hasMore={false}
        onReload={noop}
        onLoadMore={noop}
        renderItem={(x: string) => <IonItem>{x}</IonItem>}
      />,
    );
    expect(screen.getByLabelText('Cargando…')).toBeInTheDocument();
  });

  it('muestra el estado de error con reintento', () => {
    const onReload = vi.fn();
    render(
      <CursorList
        items={[]}
        status="error"
        hasMore={false}
        onReload={onReload}
        onLoadMore={noop}
        errorMessage="No se pudo cargar"
        renderItem={(x: string) => <IonItem>{x}</IonItem>}
      />,
    );
    expect(screen.getByText('No se pudo cargar')).toBeInTheDocument();
    screen.getByText('Reintentar').click();
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('muestra el estado vacío cuando no hay items', () => {
    render(
      <CursorList
        items={[]}
        status="ready"
        hasMore={false}
        onReload={noop}
        onLoadMore={noop}
        emptyTitle="Nada aún"
        renderItem={(x: string) => <IonItem>{x}</IonItem>}
      />,
    );
    expect(screen.getByText('Nada aún')).toBeInTheDocument();
  });

  it('pinta una fila por item con renderItem', () => {
    render(
      <CursorList
        items={['uno', 'dos']}
        status="ready"
        hasMore={false}
        onReload={noop}
        onLoadMore={noop}
        keyFor={(x) => x}
        renderItem={(x: string) => (
          <IonItem>
            <span>{x}</span>
          </IonItem>
        )}
      />,
    );
    expect(screen.getByText('uno')).toBeInTheDocument();
    expect(screen.getByText('dos')).toBeInTheDocument();
  });
});
