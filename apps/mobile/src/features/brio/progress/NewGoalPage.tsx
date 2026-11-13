import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { isApiError, type GoalType } from '../api';
import { formatNumber } from '../format';
import { useBrioStore } from '../brio.store';
import { ExampleTag, Icon, Segmented, SheetBar, Stepper } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { toast } from '@/lib/toast';
import './progress.css';

type Kind = 'peso' | 'carrera' | 'habito';
/** Ritmos que la API considera saludables (energy.ts acota a ±1 kg/semana). */
const SAFE_LOSS = 0.6;
const SAFE_GAIN = 0.25;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Nuevo objetivo (lienzo "Nuevo objetivo"). El de peso se guarda de verdad:
 * peso objetivo y ritmo semanal en el perfil, y la API recalcula tus kcal y
 * macros. Carrera y hábito llegarán con el plan: se ven, pero avisan.
 */
export default function NewGoalPage() {
  const history = useHistory();
  const profile = useBrioStore((s) => s.profile);
  const saveProfile = useBrioStore((s) => s.saveProfile);
  const loadProfile = useBrioStore((s) => s.loadProfile);
  const profileStatus = useBrioStore((s) => s.profileStatus);
  const current = profile?.currentWeightKg ?? null;
  const [kind, setKind] = useState<Kind>('peso');
  const [target, setTarget] = useState(profile?.targetWeightKg ?? (current ? Math.round(current - 4) : 70));
  const [weeks, setWeeks] = useState(8);
  const [dist, setDist] = useState<'5k' | '10k' | 'media' | 'maraton'>('10k');
  const [saving, setSaving] = useState(false);

  // Se puede entrar directamente: el perfil trae el peso actual y el objetivo.
  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  // Objetivo inicial: el que ya tengas o, si no, 4 kg menos que tu peso.
  useEffect(() => {
    if (profile?.targetWeightKg) setTarget(profile.targetWeightKg);
    else if (profile?.currentWeightKg) setTarget(Math.round(profile.currentWeightKg - 4));
  }, [profile?.targetWeightKg, profile?.currentWeightKg]);

  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/progress/objetivos'));
  const diff = current !== null ? target - current : 0;
  const rate = Math.abs(diff) / weeks;
  const losing = diff < 0;
  const kcal = Math.round((rate * 7700) / 7 / 10) * 10;
  const safe = losing ? SAFE_LOSS : SAFE_GAIN;
  const tooFast = diff !== 0 && rate > safe;
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  const dateLabel = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  async function create() {
    if (kind !== 'peso') {
      toast.info('Pronto podrás crear este objetivo', 'Llegará con el plan de entrenamiento.');
      return;
    }
    if (!profile || current === null) {
      toast.warning('Falta tu peso', 'Regístralo primero con el +.');
      return;
    }
    const goalType: GoalType = diff < 0 ? 'LOSE_WEIGHT' : diff > 0 ? 'GAIN_MUSCLE' : 'MAINTAIN';
    setSaving(true);
    try {
      await saveProfile({
        sex: profile.sex ?? undefined,
        birthDate: profile.birthDate ?? undefined,
        heightCm: profile.heightCm ?? undefined,
        activityLevel: profile.activityLevel,
        timezone: profile.timezone,
        goalType,
        targetWeightKg: target,
        // Firmado y acotado a ±1 kg/semana, como en la API.
        weeklyWeightChangeKg: diff === 0 ? 0 : Math.max(-1, Math.min(1, Math.round((diff / weeks) * 100) / 100)),
      });
      await loadProfile();
      toast.success('Objetivo creado', 'Tus calorías de cada día ya siguen este ritmo.');
      history.replace('/tabs/progress/objetivos');
    } catch (e) {
      toast.error('No se pudo guardar el objetivo', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const TYPES: { id: Kind; label: string; desc: string; icon: string; bg: string; fg: string }[] = [
    { id: 'peso', label: 'Peso', desc: 'Llegar a un peso', icon: PATHS.scale, bg: 'var(--brio-sleep-soft)', fg: 'var(--brio-sleep-ink)' },
    { id: 'carrera', label: 'Carrera', desc: 'Prepararte una', icon: PATHS.run, bg: 'var(--brio-food-soft)', fg: 'var(--brio-food-ink)' },
    { id: 'habito', label: 'Hábito', desc: 'Repetir algo', icon: 'M5 12.5l4.5 4.5L19 7', bg: 'var(--brio-activity-soft)', fg: 'var(--brio-activity-ink)' },
  ];

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <SheetBar title="Nuevo objetivo" onCancel={back} />

          <div className="newgoal__types" role="radiogroup" aria-label="Tipo de objetivo">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={kind === t.id}
                className="newgoal__type"
                onClick={() => {
                  setKind(t.id);
                  setWeeks(t.id === 'carrera' ? 14 : 8);
                }}
              >
                <span className="newgoal__type-ic" style={{ background: t.bg, color: t.fg }} aria-hidden="true">
                  <Icon d={t.icon} size={20} stroke={2.2} />
                </span>
                <strong>{t.label}</strong>
                <small>{t.desc}</small>
              </button>
            ))}
          </div>

          {kind === 'peso' ? (
            <div className="rk-list">
              <div className="rk-row">
                <span className="rk-row__main rk-row__title">Peso actual</span>
                <span className="rk-row__value">{current !== null ? `${formatNumber(current, 1)} kg` : 'Sin registrar'}</span>
              </div>
              <div className="rk-row newgoal__row">
                <span className="rk-row__main rk-row__title">Peso objetivo</span>
                <Stepper
                  value={`${formatNumber(target, 1)} kg`}
                  minusLabel="Medio kilo menos"
                  plusLabel="Medio kilo más"
                  onMinus={() => setTarget((t) => Math.round((t - 0.5) * 10) / 10)}
                  onPlus={() => setTarget((t) => Math.round((t + 0.5) * 10) / 10)}
                />
              </div>
              <div className="rk-row newgoal__row">
                <span className="rk-row__main">
                  <span className="rk-row__title">Fecha</span>
                  <span className="rk-row__sub">{dateLabel}</span>
                </span>
                <Stepper
                  value={`${weeks} sem`}
                  minusLabel="Una semana menos"
                  plusLabel="Una semana más"
                  onMinus={() => setWeeks((w) => Math.max(2, w - 1))}
                  onPlus={() => setWeeks((w) => Math.min(52, w + 1))}
                />
              </div>
            </div>
          ) : kind === 'carrera' ? (
            <>
              <Segmented
                label="Distancia"
                value={dist}
                onChange={setDist}
                options={[
                  { value: '5k', label: '5K' },
                  { value: '10k', label: '10K' },
                  { value: 'media', label: 'Media' },
                  { value: 'maraton', label: 'Maratón' },
                ]}
              />
              <div className="rk-list">
                <div className="rk-row newgoal__row">
                  <span className="rk-row__main">
                    <span className="rk-row__title">Día de la carrera</span>
                    <span className="rk-row__sub">{dateLabel}</span>
                  </span>
                  <Stepper
                    value={`${weeks} sem`}
                    minusLabel="Una semana menos"
                    plusLabel="Una semana más"
                    onMinus={() => setWeeks((w) => Math.max(2, w - 1))}
                    onPlus={() => setWeeks((w) => Math.min(52, w + 1))}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="rk-card rk-note">Elegirás entre pasos, sueño, proteína o registrar todas las comidas.</div>
          )}

          <section aria-label="Qué cambia" className="newgoal__impact">
            <span className="newgoal__impact-k">Qué cambia en tu plan</span>
            {kind === 'peso' ? (
              <>
                <strong>
                  {diff === 0 ? 'Mantener tu peso' : `${losing ? '−' : '+'}${formatNumber(rate, 2)} kg por semana`}
                </strong>
                <p>
                  {diff === 0
                    ? 'Tus calorías se ajustarán a lo que gastas cada día.'
                    : losing
                      ? `Comerás unas ${formatNumber(kcal)} kcal menos al día de lo que gastas. Los días que entrenes podrás comer más.`
                      : `Comerás unas ${formatNumber(kcal)} kcal más al día, con más proteína.`}
                </p>
                {tooFast ? (
                  <div className="newgoal__warn">
                    <span>Es un ritmo demasiado rápido para mantenerlo sin perder músculo ni energía.</span>
                    <button type="button" onClick={() => setWeeks(Math.ceil(Math.abs(diff) / safe))}>
                      Usar {Math.ceil(Math.abs(diff) / safe)} semanas
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <strong>
                  {kind === 'carrera' ? `Plan de ${weeks} semanas` : 'Un hábito para cada semana'} <ExampleTag />
                </strong>
                <p>Llegará con el plan de entrenamiento.</p>
              </>
            )}
          </section>

          <button type="button" className="rk-btn" disabled={saving || (kind === 'peso' && tooFast)} onClick={() => void create()}>
            Crear objetivo
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
