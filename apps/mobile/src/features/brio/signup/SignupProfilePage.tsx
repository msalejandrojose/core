import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import {
  isApiError,
  brioApi,
  type ActivityLevel,
  type Sex,
} from '../api';
import { formatNumber } from '../format';
import {
  PACES,
  dailyDeltaKcal,
  direction,
  etaLabel,
  goalTypeOf,
  signedWeekly,
  weeksToGoal,
  type PaceId,
} from '../progress/weight-goal';
import { useBrioStore } from '../brio.store';
import { Chevron, Icon, Segmented, SectionHeader } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useAuthStore } from '@/store/auth.store';
import { lastLoginMethod } from '@/features/auth/login-method';
import { toast } from '@/lib/toast';
import './signup.css';

const LEVELS: { value: ActivityLevel; short: string; label: string }[] = [
  {
    value: 'SEDENTARY',
    short: 'Sedentaria',
    label: 'Sedentaria · oficina, poco movimiento',
  },
  {
    value: 'LIGHT',
    short: 'Ligera',
    label: 'Ligera · 1-2 entrenos por semana',
  },
  {
    value: 'MODERATE',
    short: 'Moderada',
    label: 'Moderada · 3-4 entrenos por semana',
  },
  { value: 'ACTIVE', short: 'Alta', label: 'Alta · 5-6 entrenos por semana' },
  {
    value: 'VERY_ACTIVE',
    short: 'Muy alta',
    label: 'Muy alta · trabajo físico o 2 al día',
  },
];

function formatBirth(day: string): string {
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Alta 1/2 · Completa tu perfil (lienzo "Alta 1/2"). Lo mínimo para calcular
 * calorías y macros. "Saltar" crea un perfil con valores neutros (actividad
 * moderada, mantener) para no bloquear la entrada; el objetivo se completa
 * después desde Progreso.
 *
 * El peso se guarda como una pesada real, después del perfil: es el primer
 * punto de la serie y lo que permite a la API calcular los objetivos.
 */
export default function SignupProfilePage() {
  const history = useHistory();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const saveProfile = useBrioStore((s) => s.saveProfile);
  const loadProfile = useBrioStore((s) => s.loadProfile);
  const method = lastLoginMethod();

  const [sex, setSex] = useState<Sex | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [level, setLevel] = useState<ActivityLevel>('MODERATE');
  /** Peso objetivo (opcional): sin él se come para mantener. */
  const [target, setTarget] = useState('');
  const [pace, setPace] = useState<PaceId>('normal');
  const [saving, setSaving] = useState(false);

  const heightNum = Number(height.replace(',', '.'));
  const weightNum = Number(weight.replace(',', '.'));
  const targetNum = Number(target.replace(',', '.'));
  const hasTarget = target.trim() !== '' && targetNum >= 25 && targetNum <= 400;
  const dir = hasTarget && weightNum > 0 ? direction(weightNum, targetNum) : 'maintain';
  const paceKg = dir === 'maintain' ? 0 : PACES[dir].find((p) => p.id === pace)!.kg;
  const weekly = signedWeekly(dir, paceKg);
  const weeks = hasTarget ? weeksToGoal(weightNum, targetNum, weekly) : null;
  const delta = dailyDeltaKcal(weekly);
  const valid =
    sex !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(birthDate) &&
    heightNum >= 80 &&
    heightNum <= 250 &&
    weightNum >= 25 &&
    weightNum <= 400;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function save(skip: boolean) {
    setSaving(true);
    try {
      if (skip) {
        await saveProfile({
          activityLevel: 'MODERATE',
          goalType: 'MAINTAIN',
          timezone,
        });
      } else {
        await saveProfile({
          sex: sex ?? undefined,
          birthDate,
          heightCm: heightNum,
          activityLevel: level,
          goalType: goalTypeOf(dir),
          ...(hasTarget ? { targetWeightKg: targetNum } : {}),
          weeklyWeightChangeKg: weekly,
          timezone,
        });
        await brioApi.logWeight({ weightKg: weightNum });
      }
      // La pesada recalcula los objetivos en el servidor: se relee el perfil.
      await loadProfile();
      history.replace(skip ? '/tabs/today' : '/alta/conectar');
    } catch (e) {
      toast.error(
        'No se pudo guardar tu perfil',
        isApiError(e) ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen signup">
          <div className="signup__bar">
            <button
              type="button"
              className="rk-iconbtn signup__back"
              aria-label="Volver al acceso"
              onClick={() => void logout()}
            >
              <Icon d={PATHS.back} size={20} stroke={2.4} />
            </button>
            <span className="signup__step">Paso 1 de 2</span>
            <button
              type="button"
              className="rk-textbtn signup__skip"
              disabled={saving}
              onClick={() => void save(true)}
            >
              Saltar
            </button>
          </div>

          <header className="signup__head">
            <h1>Completa tu perfil</h1>
            <span>
              Con esto calculamos tus calorías y tu plan. Puedes cambiarlo
              cuando quieras.
            </span>
          </header>

          <div className="signup__account">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="signup__avatar" />
            ) : (
              <span className="signup__avatar" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="9" r="4" />
                  <path d="M4 21a8 7 0 0 1 16 0z" />
                </svg>
              </span>
            )}
            <div className="rk-row__main">
              <span className="signup__name">{name || 'Tu cuenta'}</span>
              <span className="rk-row__sub">{user?.email}</span>
            </div>
            {method ? (
              <span className="signup__chip">
                {method === 'google' ? 'Google' : method === 'apple' ? 'Apple' : 'Correo'}
              </span>
            ) : null}
          </div>

          <section className="rk-section" aria-labelledby="datos">
            <SectionHeader id="datos">Sobre ti</SectionHeader>
            <div className="rk-list">
              <div className="rk-row signup__row">
                <span className="rk-row__main rk-row__title">Sexo</span>
                <div className="signup__sex">
                  <Segmented
                    label="Sexo"
                    small
                    value={sex ?? ('' as Sex)}
                    onChange={setSex}
                    options={[
                      { value: 'MALE', label: 'Hombre' },
                      { value: 'FEMALE', label: 'Mujer' },
                    ]}
                  />
                </div>
              </div>
              <label className="rk-row signup__row">
                <span className="rk-row__main rk-row__title">
                  Fecha de nacimiento
                </span>
                <span className="rk-row__value">
                  {birthDate ? formatBirth(birthDate) : 'dd/mm/aaaa'}
                </span>
                {/* Selector nativo encima de la fila: en el móvil abre la rueda del sistema. */}
                <input
                  type="date"
                  className="signup__overlay"
                  aria-label="Fecha de nacimiento"
                  max={new Date().toISOString().slice(0, 10)}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </label>
              <label className="rk-row signup__row">
                <span className="rk-row__main rk-row__title">Altura</span>
                <input
                  className="signup__num"
                  inputMode="numeric"
                  placeholder="178"
                  aria-label="Altura en centímetros"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
                <span className="rk-row__value">cm</span>
              </label>
              <label className="rk-row signup__row">
                <span className="rk-row__main rk-row__title">Peso</span>
                <input
                  className="signup__num"
                  inputMode="decimal"
                  placeholder="76,5"
                  aria-label="Peso en kilos"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  onBlur={() =>
                    weightNum > 0 && setWeight(formatNumber(weightNum, 1))
                  }
                />
                <span className="rk-row__value">kg</span>
              </label>
              <label className="rk-row signup__row">
                <span className="rk-row__main rk-row__title">
                  Actividad diaria
                </span>
                <span className="rk-row__value">
                  {LEVELS.find((l) => l.value === level)?.short}
                </span>
                <Chevron />
                <select
                  className="signup__overlay"
                  aria-label="Actividad diaria"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ActivityLevel)}
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rk-section" aria-labelledby="obj">
            <SectionHeader id="obj">Tu objetivo</SectionHeader>
            <div className="rk-list">
              <label className="rk-row signup__row">
                <span className="rk-row__main rk-row__title">Peso objetivo</span>
                <input
                  className="signup__num"
                  inputMode="decimal"
                  placeholder={weightNum > 0 ? formatNumber(weightNum, 1) : '72'}
                  aria-label="Peso objetivo en kilos (opcional)"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onBlur={() => hasTarget && setTarget(formatNumber(targetNum, 1))}
                />
                <span className="rk-row__value">kg</span>
              </label>
            </div>
            {dir !== 'maintain' ? (
              <Segmented
                label="Ritmo"
                value={pace}
                onChange={setPace}
                options={PACES[dir].map((p) => ({
                  value: p.id,
                  label: `${p.label} · ${formatNumber(p.kg, 2)}`,
                }))}
              />
            ) : null}
            <p className="rk-note">
              {dir === 'maintain'
                ? hasTarget
                  ? 'Ya estás en tu peso: comerás lo que gastas, más lo que entrenes cada día.'
                  : 'Opcional. Sin peso objetivo comerás para mantener tu peso. Puedes fijarlo luego en Progreso → Objetivos.'
                : `${dir === 'lose' ? 'Bajas' : 'Subes'} ${formatNumber(paceKg, 2)} kg por semana${
                    weeks ? ` y llegas hacia el ${etaLabel(weeks)}` : ''
                  }: unas ${formatNumber(Math.abs(delta))} kcal al día ${dir === 'lose' ? 'menos' : 'más'} de lo que gastas.${
                    pace === 'rapido' && dir === 'lose' ? ' Es un ritmo exigente: cuesta más no perder músculo.' : ''
                  }`}
            </p>
          </section>

          <button
            type="button"
            className="rk-btn signup__cta"
            disabled={!valid || saving}
            onClick={() => void save(false)}
          >
            {saving ? <IonSpinner name="crescent" /> : 'Continuar'}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
