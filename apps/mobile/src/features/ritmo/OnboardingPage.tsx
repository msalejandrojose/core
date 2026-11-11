import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonToolbar,
} from '@ionic/react';
import {
  isApiError,
  ritmoApi,
  type ActivityLevel,
  type GoalType,
  type Sex,
} from './api';
import { useRitmoStore } from './ritmo.store';
import { toast } from '@/lib/toast';
import './ritmo.css';

const GOALS: { value: GoalType; label: string }[] = [
  { value: 'LOSE_WEIGHT', label: 'Perder' },
  { value: 'MAINTAIN', label: 'Mantener' },
  { value: 'GAIN_MUSCLE', label: 'Ganar' },
];

const LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'SEDENTARY', label: 'Sedentario (oficina, poco movimiento)' },
  { value: 'LIGHT', label: 'Ligero (1-2 entrenos por semana)' },
  { value: 'MODERATE', label: 'Moderado (3-4 entrenos por semana)' },
  { value: 'ACTIVE', label: 'Activo (5-6 entrenos por semana)' },
  { value: 'VERY_ACTIVE', label: 'Muy activo (trabajo físico o 2 al día)' },
];

const SEXES: { value: Sex; label: string }[] = [
  { value: 'FEMALE', label: 'Mujer' },
  { value: 'MALE', label: 'Hombre' },
  { value: 'OTHER', label: 'Prefiero no decirlo' },
];

/**
 * Onboarding: lo mínimo para poder calcular un objetivo (sexo, fecha de
 * nacimiento, altura, nivel de actividad, objetivo) más la primera pesada.
 *
 * El peso se registra como una pesada real (`POST /ritmo/weight`), no como un
 * campo del perfil: es el primer punto de la serie de progreso y además es lo
 * que permite a la API recalcular los targets. Se guarda DESPUÉS del perfil
 * porque el recálculo necesita que el perfil ya exista.
 */
export default function OnboardingPage() {
  const history = useHistory();
  const profile = useRitmoStore((s) => s.profile);
  const saveProfile = useRitmoStore((s) => s.saveProfile);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const loadDay = useRitmoStore((s) => s.loadDay);

  // La misma pantalla hace de onboarding y de edición del objetivo: con perfil
  // ya guardado se precargan sus valores. Son los mismos campos y las mismas
  // reglas, así que duplicar la pantalla solo duplicaría el mantenimiento.
  const isEditing = profile !== null;

  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'FEMALE');
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '');
  const [heightCm, setHeightCm] = useState(
    profile?.heightCm ? String(profile.heightCm) : '',
  );
  const [weightKg, setWeightKg] = useState(
    profile?.currentWeightKg ? String(profile.currentWeightKg) : '',
  );
  const [level, setLevel] = useState<ActivityLevel>(
    profile?.activityLevel ?? 'MODERATE',
  );
  const [goal, setGoal] = useState<GoalType>(profile?.goalType ?? 'MAINTAIN');
  const [saving, setSaving] = useState(false);

  const height = Number(heightCm.replace(',', '.'));
  const weight = Number(weightKg.replace(',', '.'));
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    Number.isFinite(height) &&
    height >= 80 &&
    height <= 250 &&
    Number.isFinite(weight) &&
    weight >= 25 &&
    weight <= 400;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    try {
      await saveProfile({
        sex,
        birthDate,
        heightCm: height,
        activityLevel: level,
        goalType: goal,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      // Solo se registra pesada si el número ha cambiado: reeditar el objetivo
      // no debería ensuciar la serie de peso con un punto repetido.
      if (weight !== profile?.currentWeightKg) {
        await ritmoApi.logWeight({ weightKg: weight });
      }
      // Se relee el perfil porque la pesada ha recalculado los targets en el
      // servidor; los que devolvió el PUT anterior ya están desactualizados.
      await loadProfile();
      await loadDay();
      toast.success(
        isEditing ? 'Objetivo actualizado' : 'Listo',
        isEditing ? undefined : 'Ya puedes empezar a registrar tu día.',
      );
      // Editando se vuelve a Progreso, que es de donde se llega; en el
      // onboarding no hay pantalla previa a la que volver.
      history.replace(isEditing ? '/tabs/progress' : '/tabs/today');
    } catch (e) {
      toast.error(
        'No se pudo guardar tu perfil',
        isApiError(e) ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonPage>
      {isEditing ? (
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/tabs/progress" text="Progreso" />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
      ) : null}
      <IonContent className="ion-padding">
        <h1
          className="core-title"
          style={{ margin: isEditing ? '8px 4px 6px' : '32px 4px 6px' }}
        >
          {isEditing ? 'Tu objetivo' : 'Vamos a calcular tu objetivo'}
        </h1>
        <p className="core-subtitle" style={{ margin: '0 4px 28px' }}>
          Con esto estimamos tu gasto diario y tus calorías objetivo. Puedes
          cambiarlo cuando quieras.
        </p>

        <p className="core-section-label">Objetivo</p>
        <IonSegment
          className="core-segment"
          value={goal}
          onIonChange={(e) => setGoal(e.detail.value as GoalType)}
        >
          {GOALS.map((option) => (
            <IonSegmentButton key={option.value} value={option.value}>
              {option.label}
            </IonSegmentButton>
          ))}
        </IonSegment>

        <p className="core-section-label" style={{ marginTop: 24 }}>
          Sobre ti
        </p>
        <div className="core-group">
          <IonItem lines="full">
            <IonSelect
              label="Sexo"
              value={sex}
              onIonChange={(e) => setSex(e.detail.value as Sex)}
            >
              {SEXES.map((option) => (
                <IonSelectOption key={option.value} value={option.value}>
                  {option.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem lines="full">
            <IonLabel>Nacimiento</IonLabel>
            <IonInput
              slot="end"
              type="date"
              style={{ textAlign: 'right' }}
              value={birthDate}
              onIonInput={(e) => setBirthDate(String(e.detail.value ?? ''))}
            />
          </IonItem>
          <IonItem lines="full">
            <IonInput
              type="number"
              inputMode="decimal"
              label="Altura"
              placeholder="178"
              value={heightCm}
              onIonInput={(e) => setHeightCm(String(e.detail.value ?? ''))}
            />
            <IonLabel slot="end" color="medium">
              cm
            </IonLabel>
          </IonItem>
          <IonItem lines="none">
            <IonInput
              type="number"
              inputMode="decimal"
              label="Peso"
              placeholder="80.0"
              value={weightKg}
              onIonInput={(e) => setWeightKg(String(e.detail.value ?? ''))}
            />
            <IonLabel slot="end" color="medium">
              kg
            </IonLabel>
          </IonItem>
        </div>

        <p className="core-section-label" style={{ marginTop: 24 }}>
          Nivel de actividad
        </p>
        <div className="core-group">
          <IonItem lines="none">
            <IonSelect
              label="Nivel"
              interface="action-sheet"
              value={level}
              onIonChange={(e) => setLevel(e.detail.value as ActivityLevel)}
            >
              {LEVELS.map((option) => (
                <IonSelectOption key={option.value} value={option.value}>
                  {option.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
        </div>

        <IonButton
          expand="block"
          style={{ margin: '32px 0 40px' }}
          disabled={!valid || saving}
          onClick={() => void submit()}
        >
          {isEditing ? 'Guardar cambios' : 'Calcular mi objetivo'}
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
