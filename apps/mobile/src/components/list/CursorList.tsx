import { Fragment, type ReactNode } from 'react';
import {
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  type RefresherEventDetail,
} from '@ionic/react';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ux';
import type { CursorListStatus } from './use-cursor-list';

export interface CursorListProps<T> {
  items: T[];
  status: CursorListStatus;
  hasMore: boolean;
  /** Recarga desde la primera página. Cablea pull-to-refresh y reintento. */
  onReload: () => Promise<void> | void;
  /** Trae la siguiente página. Cablea el scroll infinito. */
  onLoadMore: () => Promise<void> | void;
  /** Pinta una fila. Envuélvela normalmente en un `IonItem`. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Clave estable por item (default: el índice, evítalo si la lista muta). */
  keyFor?: (item: T, index: number) => string;

  // --- Estado vacío ---
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;

  // --- Estado de error ---
  errorMessage?: string;

  // --- Estado de carga ---
  /** Nº de filas skeleton mientras carga la primera página (default 4). */
  skeletonRows?: number;

  /** Activa el pull-to-refresh (default true). */
  refreshable?: boolean;
  /** Contenido opcional sobre la lista (banners, chips de filtro…). */
  header?: ReactNode;
}

/**
 * Listado genérico paginado por cursor: equivalente móvil del DataTable del
 * backoffice (BO-04). Resuelve de forma uniforme los cuatro estados de una
 * lista —cargando (skeletons sobre superficie, nunca spinner a pantalla
 * completa), error con reintento, vacío editorial y contenido con scroll
 * infinito— más el pull-to-refresh nativo.
 *
 * Es presentacional: se coloca DENTRO de un `IonContent` (así el consumidor
 * controla el header/toolbar de la página) y se alimenta del hook
 * `useCursorList`. La forma de cada fila la decide `renderItem`, igual que las
 * `columns` del DataTable.
 */
export function CursorList<T>({
  items,
  status,
  hasMore,
  onReload,
  onLoadMore,
  renderItem,
  keyFor,
  emptyIcon,
  emptyTitle = 'No hay nada por aquí todavía.',
  emptyDescription,
  errorMessage = 'No se pudieron cargar los datos.',
  skeletonRows = 4,
  refreshable = true,
  header,
}: CursorListProps<T>) {
  async function handleRefresh(e: CustomEvent<RefresherEventDetail>) {
    try {
      await onReload();
    } finally {
      e.detail.complete();
    }
  }

  return (
    <>
      {refreshable ? (
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>
      ) : null}

      {header}

      {status === 'loading' ? (
        <SkeletonList rows={skeletonRows} />
      ) : status === 'error' ? (
        <ErrorState message={errorMessage} onRetry={() => void onReload()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <>
          <IonList inset className="core-group">
            {items.map((item, i) => (
              <Fragment key={keyFor ? keyFor(item, i) : String(i)}>
                {renderItem(item, i)}
              </Fragment>
            ))}
          </IonList>

          <IonInfiniteScroll
            disabled={!hasMore}
            onIonInfinite={async (e) => {
              await onLoadMore();
              await e.target.complete();
            }}
          >
            <IonInfiniteScrollContent>
              <IonSpinner name="dots" />
            </IonInfiniteScrollContent>
          </IonInfiniteScroll>
        </>
      )}
    </>
  );
}
