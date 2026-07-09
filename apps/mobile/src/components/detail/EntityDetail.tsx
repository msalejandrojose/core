import { useEffect } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import type { CustomValidator, FormSchema, FormValues } from '@core/forms';
import {
  FormRenderer,
  useCoreForm,
  type AsyncValidator,
} from '@/components/forms';
import { ErrorState, SkeletonList } from '@/components/ux';
import { useDetailMode, type DetailMode } from '@/lib/use-detail-mode';

export interface EntityDetailProps {
  /** Formulario declarativo de `@core/forms` que describe la entidad. */
  schema: FormSchema;
  /** Valores de la entidad existente (ver / editar). Omitir en alta. */
  values?: FormValues;
  /** Alta de una entidad nueva (arranca en modo 'create'). */
  isCreate?: boolean;
  /**
   * Modo inicial para una entidad existente. 'view' por defecto; pásalo como
   * 'edit' cuando se llega desde una acción "Editar" de la lista. Ignorado si
   * `isCreate` es true.
   */
  initialMode?: Exclude<DetailMode, 'create'>;
  /** Estado de carga de la entidad existente (para skeleton / error). */
  status?: 'loading' | 'ready' | 'error';
  /** Títulos por modo. Con defaults sensatos ("Detalle" / "Editar" / "Nuevo"). */
  titles?: Partial<Record<DetailMode, string>>;
  /** `defaultHref` del botón de volver (default `/tabs/home`). */
  backHref?: string;
  /**
   * Persiste la entidad (crear o actualizar). Si la promesa se resuelve se
   * considera éxito y en modo edición se vuelve a 'view'; si rechaza, la
   * pantalla permanece en edición (el caller ya habrá notificado el fallo).
   */
  onSubmit: (
    values: FormValues,
    mode: Exclude<DetailMode, 'view'>,
  ) => void | Promise<void>;
  /** Cancelar un alta (crear): normalmente navegar atrás. En edición no aplica. */
  onCancel?: () => void;
  /** Reintento de la carga (estado de error). */
  onRetry?: () => void;
  /** i18n opcional para las claves de label del schema. */
  translate?: (key: string) => string;
  validators?: Record<string, CustomValidator>;
  asyncValidator?: AsyncValidator;
}

const DEFAULT_TITLES: Record<DetailMode, string> = {
  view: 'Detalle',
  edit: 'Editar',
  create: 'Nuevo',
};

/**
 * Pantalla de detalle/edición de una entidad de sección, con modos
 * ver / editar / crear. Espejo móvil del detalle de sección del backoffice
 * (`ApiSectionDetailPage`), reutilizando el renderer declarativo de
 * `@core/forms`: en modo 'view' el `FormRenderer` va en `disabled` (solo
 * lectura) y en 'edit'/'create' es editable, alimentado por `useCoreForm`.
 *
 * Es agnóstica del dominio: recibe el `schema`, los `values` de la entidad y un
 * `onSubmit`. El cableado a endpoints concretos por sección lo hace el consumidor
 * (junto con el listado de MOB-09).
 */
export function EntityDetail({
  schema,
  values,
  isCreate = false,
  initialMode = 'view',
  status = 'ready',
  titles,
  backHref = '/tabs/home',
  onSubmit,
  onCancel,
  onRetry,
  translate,
  validators,
  asyncValidator,
}: EntityDetailProps) {
  const { mode, isEditable, enterEdit, enterView } = useDetailMode(
    isCreate ? 'create' : initialMode,
  );

  const form = useCoreForm({
    schema,
    initialValues: values,
    validators,
    asyncValidator,
    onSubmit: async (v) => {
      try {
        await onSubmit(v, mode === 'create' ? 'create' : 'edit');
      } catch {
        // El caller notifica el error; nos quedamos en edición para reintentar.
        return;
      }
      if (mode === 'edit') enterView();
    },
  });

  // Rellena el formulario cuando llegan (async) los valores de una entidad
  // existente. Requiere que `schema` sea estable entre renders.
  useEffect(() => {
    if (values && !isCreate) form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, isCreate]);

  function handleCancel() {
    if (mode === 'create') {
      onCancel?.();
      return;
    }
    // Edición: descarta los cambios y vuelve a solo lectura.
    form.reset(values);
    enterView();
  }

  const title = titles?.[mode] ?? DEFAULT_TITLES[mode];

  const saveLabel = form.submitting
    ? mode === 'create'
      ? 'Creando…'
      : 'Guardando…'
    : mode === 'create'
      ? 'Crear'
      : 'Guardar';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {isEditable ? (
              <IonButton onClick={handleCancel} disabled={form.submitting}>
                Cancelar
              </IonButton>
            ) : (
              <IonBackButton defaultHref={backHref} text="" />
            )}
          </IonButtons>

          <IonTitle>{title}</IonTitle>

          <IonButtons slot="end">
            {mode === 'view' ? (
              <IonButton onClick={enterEdit}>Editar</IonButton>
            ) : (
              <IonButton
                strong
                onClick={form.handleSubmit}
                disabled={form.submitting}
              >
                {saveLabel}
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {!isCreate && status === 'loading' ? (
          <SkeletonList rows={4} />
        ) : !isCreate && status === 'error' ? (
          <ErrorState
            message="No se pudo cargar la información."
            onRetry={onRetry}
          />
        ) : (
          <FormRenderer
            schema={schema}
            values={form.values}
            errors={form.errors}
            setValue={form.setValue}
            blur={form.blur}
            translate={translate}
            disabled={mode === 'view'}
          />
        )}
      </IonContent>
    </IonPage>
  );
}
