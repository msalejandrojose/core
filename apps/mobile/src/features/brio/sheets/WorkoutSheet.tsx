import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { isApiError, brioApi, type ActivityType, type Effort } from '../api';
import { formatKcal, nowIn, todayIn } from '../format';
import { useBrioStore } from '../brio.store';
import { tapSuccess } from '../haptics';
import { Icon, Segmented, SectionHeader, SheetBar, Stepper } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { snackbar } from '@/lib/snackbar';
import { toast } from '@/lib/toast';
import { CardioFields, StrengthEditor } from './WorkoutDetails';
import {
  EMPTY_CARDIO,
  cardioBody,
  exercisesBody,
  type DraftCardio,
  type DraftExercise,
} from './workout-draft';
import './sheets.css';

/** Las seis teselas del diseño y el tipo de actividad del catálogo que usan. */
const TILES = [
  { id: 'carrera', label: 'Carrera', icon: PATHS.run, code: 'running' },
  { id: 'fuerza', label: 'Fuerza', icon: PATHS.strength, code: 'strength' },
  { id: 'bici', label: 'Bici', icon: PATHS.bike, code: 'cycling' },
  { id: 'caminar', label: 'Caminar', icon: PATHS.walk, code: 'walking' },
  { id: 'clase', label: 'Clase', icon: PATHS.dance, code: 'hiit' },
  { id: 'otro', label: 'Otro', icon: PATHS.plus, code: null },
] as const;

type TileId = (typeof TILES)[number]['id'];

const LEVELS: { value: Effort; label: string }[] = [
  { value: 'LIGHT', label: 'Suave' },
  { value: 'MODERATE', label: 'Moderada' },
  { value: 'VIGOROUS', label: 'Intensa' },
];
/** RPE que equivale a cada intensidad si no se afina (el mismo que usa la API). */
const EFFORT_RPE: Record<Effort, number> = { LIGHT: 3, MODERATE: 5, VIGOROUS: 8 };
const CARDIO_KINDS = ['RUN', 'CYCLE', 'WALK', 'HIKE', 'SWIM', 'ELLIPTICAL', 'OTHER_CARDIO'];
/** Mismos factores que la API (domain/services/energy.ts). */
const EFFORT_FACTOR: Record<Effort, number> = { LIGHT: 0.85, MODERATE: 1, VIGOROUS: 1.15 };

interface WorkoutSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Registrar entreno (lienzo "Registrar entreno"): tipo, duración, intensidad y
 * las calorías estimadas. La estimación usa la misma fórmula que la API (MET ×
 * peso) solo para enseñarla; lo que se guarda lo calcula el servidor.
 */
export function WorkoutSheet({ isOpen, onClose }: WorkoutSheetProps) {
  const day = useBrioStore((s) => s.day);
  const profile = useBrioStore((s) => s.profile);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const [types, setTypes] = useState<ActivityType[] | null>(null);
  const [tile, setTile] = useState<TileId>('fuerza');
  const [otherId, setOtherId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(45);
  const [effort, setEffort] = useState<Effort>('MODERATE');
  const [rpe, setRpe] = useState<number | null>(null);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [cardio, setCardio] = useState<DraftCardio>(EMPTY_CARDIO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && types === null) {
      brioApi.activityTypes().then(setTypes).catch(() => setTypes([]));
    }
  }, [isOpen, types]);

  useEffect(() => {
    if (isOpen) {
      setTile('fuerza');
      setOtherId(null);
      setMinutes(45);
      setEffort('MODERATE');
      setRpe(null);
      setExercises([]);
      setCardio(EMPTY_CARDIO);
    }
  }, [isOpen]);

  const tileCodes = TILES.map((t) => t.code).filter(Boolean);
  const others = (types ?? []).filter((t) => !tileCodes.includes(t.code as never));
  const selected = useMemo(() => {
    if (!types) return null;
    if (tile === 'otro') return types.find((t) => t.id === otherId) ?? null;
    const code = TILES.find((t) => t.id === tile)?.code;
    return types.find((t) => t.code === code) ?? null;
  }, [types, tile, otherId]);

  const isStrength = selected?.kind === 'STRENGTH';
  const isCardio = !!selected && CARDIO_KINDS.includes(selected.kind);
  const weight = profile?.currentWeightKg ?? null;
  const estimate =
    selected && weight
      ? Math.round(((selected.met * 3.5 * weight) / 200) * minutes * EFFORT_FACTOR[effort] / 5) * 5
      : null;
  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const isToday = day === todayIn(timezone);

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const session = await brioApi.logActivity({
        activityTypeId: selected.id,
        // Hoy: ahora. Otro día: mediodía de ese día, para que el huso no lo mueva.
        startedAt: isToday ? new Date().toISOString() : new Date(`${day}T12:00:00.000Z`).toISOString(),
        durationSec: minutes * 60,
        effort,
        ...(rpe !== null ? { rpe } : {}),
        ...(isStrength && exercisesBody(exercises)?.length ? { exercises: exercisesBody(exercises) } : {}),
        ...(isCardio ? cardioBody(cardio) : {}),
      });
      await refreshDay();
      void tapSuccess();
      snackbar.undo(`Entreno registrado · ${formatKcal(session.kcalBurned)} kcal`, async () => {
        try {
          await brioApi.deleteActivity(session.id);
          await refreshDay();
        } catch {
          toast.error('No se pudo deshacer');
        }
      });
      onClose();
    } catch (e) {
      if (isApiError(e) && e.code === 'BRIO_WEIGHT_UNKNOWN') {
        toast.warning('Falta tu peso', 'Regístralo para poder calcular las calorías del entreno.');
      } else {
        toast.error('No se pudo guardar el entreno', isApiError(e) ? e.message : undefined);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="rk-modal-full">
      <IonContent>
        <div className="rk-sheet workout">
          <span className="rk-grab" aria-hidden="true" />
          <SheetBar title="Registrar entreno" onCancel={onClose} />

          <div className="workout__info">
            <Icon d={PATHS.info} size={20} />
            <span>Si entrenaste con el reloj o con Hevy, no hace falta: se importará solo cuando los conectes.</span>
          </div>

          <section className="rk-section" aria-labelledby="tipo">
            <SectionHeader id="tipo">Tipo</SectionHeader>
            <div className="workout__types">
              {TILES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={tile === t.id}
                  className="workout__type"
                  onClick={() => setTile(t.id)}
                >
                  <Icon d={t.icon} size={22} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            {tile === 'otro' ? (
              <div className="workout__others" role="group" aria-label="Otra actividad">
                {others.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={otherId === t.id}
                    className="workout__chip"
                    onClick={() => setOtherId(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <div className="rk-list">
            <div className="rk-row workout__row">
              <span className="rk-row__main rk-row__title">Duración</span>
              <Stepper
                value={`${minutes} min`}
                minusLabel="Cinco minutos menos"
                plusLabel="Cinco minutos más"
                onMinus={() => setMinutes((m) => Math.max(5, m - 5))}
                onPlus={() => setMinutes((m) => Math.min(300, m + 5))}
              />
            </div>
            <div className="rk-row">
              <span className="rk-row__main rk-row__title">Cuándo</span>
              <span className="rk-row__value workout__when">
                {isToday ? `Hoy, ${nowIn(timezone)}` : 'Ese día, 12:00'}
              </span>
            </div>
          </div>

          <section className="rk-section" aria-labelledby="int">
            <SectionHeader id="int">Intensidad</SectionHeader>
            <Segmented
              label="Intensidad"
              value={effort}
              onChange={(v) => {
                setEffort(v);
                setRpe(null);
              }}
              options={LEVELS}
            />
            <div className="rk-list">
              <div className="rk-row workout__row">
                <span className="rk-row__main">
                  <span className="rk-row__title">Esfuerzo (RPE)</span>
                  <span className="rk-row__sub">{rpe === null ? 'Según la intensidad' : 'De 1, muy fácil, a 10, máximo'}</span>
                </span>
                <Stepper
                  value={rpe ?? EFFORT_RPE[effort]}
                  minusLabel="Un punto menos de esfuerzo"
                  plusLabel="Un punto más de esfuerzo"
                  onMinus={() => setRpe((r) => Math.max(1, (r ?? EFFORT_RPE[effort]) - 1))}
                  onPlus={() => setRpe((r) => Math.min(10, (r ?? EFFORT_RPE[effort]) + 1))}
                />
              </div>
            </div>
          </section>

          {isStrength ? <StrengthEditor value={exercises} onChange={setExercises} /> : null}
          {isCardio ? <CardioFields value={cardio} onChange={setCardio} /> : null}

          <div className="workout__estimate">
            <span>Calorías estimadas</span>
            <strong>{estimate !== null ? `${formatKcal(estimate)} kcal` : '—'}</strong>
          </div>
          {weight === null ? <p className="rk-note">Registra tu peso para estimar las calorías.</p> : null}

          <button type="button" className="rk-btn workout__save" disabled={!selected || saving} onClick={() => void save()}>
            Guardar entreno
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
}
