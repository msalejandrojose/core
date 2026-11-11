import { IonIcon, IonModal } from '@ionic/react';
import { barbellOutline, restaurantOutline, scaleOutline } from 'ionicons/icons';
import { mealLabel } from './format';
import { useRegisterStore, type RegisterSheet } from './register.store';
import { LogMealSheet } from './LogMealSheet';
import { LogActivitySheet } from './LogActivitySheet';
import { LogWeightSheet } from './LogWeightSheet';

const ACTIONS: {
  sheet: Exclude<RegisterSheet, 'menu'>;
  label: string;
  icon: string;
  domain: 'food' | 'activity' | 'sleep';
}[] = [
  { sheet: 'meal', label: 'Comida', icon: restaurantOutline, domain: 'food' },
  { sheet: 'activity', label: 'Entreno', icon: barbellOutline, domain: 'activity' },
  { sheet: 'weight', label: 'Peso', icon: scaleOutline, domain: 'sleep' },
];

/**
 * Hojas de registro de la app, montadas una sola vez en el shell: el menú
 * "Registrar" que abre el botón + y las tres hojas concretas. Así se abren
 * igual desde Hoy, Plan o Progreso, y el estado no se pierde al cambiar de
 * pestaña.
 */
export function RegisterSheets() {
  const sheet = useRegisterStore((s) => s.sheet);
  const mealType = useRegisterStore((s) => s.mealType);
  const open = useRegisterStore((s) => s.open);
  const close = useRegisterStore((s) => s.close);

  return (
    <>
      <IonModal
        className="ritmo-sheet-auto"
        isOpen={sheet === 'menu'}
        onDidDismiss={() => {
          if (useRegisterStore.getState().sheet === 'menu') close();
        }}
        initialBreakpoint={1}
        breakpoints={[0, 1]}
        handle
      >
        <div className="ritmo-register">
          <div className="ritmo-sheet-bar">
            <button type="button" className="ritmo-sheet-bar__action" onClick={close}>
              Cerrar
            </button>
            <span className="ritmo-sheet-bar__title">Registrar</span>
            <span />
          </div>
          <p className="ritmo-subhead ritmo-register__hint">
            Ahora lo más probable: {mealLabel(mealType).toLowerCase()}
          </p>
          <div className="ritmo-register__grid">
            {ACTIONS.map((action) => (
              <button
                key={action.sheet}
                type="button"
                className="ritmo-register__tile"
                onClick={() => open(action.sheet, mealType)}
              >
                <span
                  className={`ritmo-register__icon ritmo-register__icon--${action.domain}`}
                  aria-hidden="true"
                >
                  <IonIcon icon={action.icon} />
                </span>
                <span className="ritmo-register__label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </IonModal>

      <LogMealSheet
        isOpen={sheet === 'meal'}
        initialMealType={mealType}
        onClose={close}
      />
      <LogActivitySheet isOpen={sheet === 'activity'} onClose={close} />
      <LogWeightSheet isOpen={sheet === 'weight'} onClose={close} />
    </>
  );
}
