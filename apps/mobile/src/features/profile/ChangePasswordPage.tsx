import { useState, type FormEvent } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { checkmarkCircleOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useChangePassword } from './use-change-password';

const PROFILE_HREF = '/tabs/settings/profile';

/**
 * Cambio de contraseña del usuario autenticado. Valida longitud y coincidencia
 * en cliente antes de llamar a `change-password`.
 */
export default function ChangePasswordPage() {
  const { submit, loading, done, error } = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (next.length < 8) {
      setLocalError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (next !== confirm) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    await submit(current, next);
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // La háptica no existe en web/PWA; no es un error.
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={PROFILE_HREF} text="" />
          </IonButtons>
          <IonTitle>Cambiar contraseña</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {done ? (
          <div style={{ maxWidth: 420, margin: '0 auto', paddingTop: '4vh' }}>
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <IonIcon
                icon={checkmarkCircleOutline}
                aria-hidden="true"
                style={{ fontSize: 48, color: 'var(--ion-color-primary)' }}
              />
            </div>
            <p className="core-subtitle" style={{ marginBottom: 28, textAlign: 'center' }}>
              Tu contraseña se ha actualizado.
            </p>
            <IonButton
              expand="block"
              routerLink={PROFILE_HREF}
              routerDirection="back"
            >
              Hecho
            </IonButton>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            style={{ display: 'grid', gap: 14, maxWidth: 420, margin: '0 auto' }}
          >
            <IonInput
              className="core-field"
              label="Contraseña actual"
              labelPlacement="stacked"
              fill="outline"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              value={current}
              onIonInput={(e) => setCurrent(e.detail.value ?? '')}
            />
            <IonInput
              className="core-field"
              label="Nueva contraseña"
              labelPlacement="stacked"
              fill="outline"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
              value={next}
              onIonInput={(e) => setNext(e.detail.value ?? '')}
            />
            <IonInput
              className="core-field"
              label="Repetir nueva contraseña"
              labelPlacement="stacked"
              fill="outline"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onIonInput={(e) => setConfirm(e.detail.value ?? '')}
            />
            {(localError || error) && (
              <IonNote color="danger" style={{ fontSize: 14 }}>
                {localError ?? error}
              </IonNote>
            )}
            <IonButton
              type="submit"
              expand="block"
              disabled={loading || !current || !next || !confirm}
              style={{ marginTop: 8 }}
            >
              {loading ? <IonSpinner name="crescent" /> : 'Guardar'}
            </IonButton>
          </form>
        )}
      </IonContent>
    </IonPage>
  );
}
