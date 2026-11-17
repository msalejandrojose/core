import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { SWIPE_TO_CLOSE } from './swipe';
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
import { RoutinePick } from '../routines/RoutinePick';
import { ROUTINE_KINDS, workoutDraftFrom } from '../routines/routine-draft';
import type { Routine } from '../routines/routines.api';
import './sheets.css';

/** Si aún no tienes historial, estas son las cinco de arriba. */
const DEFAULT_CODES = ['running', 'strength', 'cycling', 'walking', 'hiit'];
/** Ideas en «Otro deporte» antes de escribir nada. */
const SUGGESTED_CODES = ['football', 'padel', 'tennis', 'swimming', 'basketball', 'yoga', 'football_7', 'futsal'];
const FAVORITES = 5;

/** Dibujo de cada tipo, por código o disciplina. */
function iconFor(t: ActivityType): string {
  const c = t.code ?? '';
  if (/^(football|futsal|football_7|basketball|handball|volleyball|beach_volleyball|rugby|hockey)$/.test(c)) return PATHS.ball;
  if (/^(padel|tennis|tennis_doubles|squash|badminton|table_tennis|fronton|golf)$/.test(c)) return PATHS.racket;
  if (/^(swimming|water_polo|surf|kayak|rowing)$/.test(c)) return PATHS.swim;
  if (t.kind === 'STRENGTH') return PATHS.strength;
  if (t.kind === 'RUN') return PATHS.run;
  if (t.kind === 'CYCLE') return PATHS.bike;
  if (t.kind === 'WALK' || t.kind === 'HIKE') return PATHS.walk;
  return PATHS.dance;
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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
  /** Tipo elegido (id del catálogo). */
  const [typeId, setTypeId] = useState<string | null>(null);
  /** «Otro deporte» abierto: buscador en vez de lista larga. */
  const [otherOpen, setOtherOpen] = useState(false);
  const [sportQuery, setSportQuery] = useState('');
  const [minutes, setMinutes] = useState(45);
  const [effort, setEffort] = useState<Effort>('MODERATE');
  const [rpe, setRpe] = useState<number | null>(null);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [cardio, setCardio] = useState<DraftCardio>(EMPTY_CARDIO);
  const [saving, setSaving] = useState(false);
  /** Rutina elegida en «Tus rutinas» (se enlaza al guardar). */
  const [routineId, setRoutineId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && types === null) {
      brioApi.activityTypes().then(setTypes).catch(() => setTypes([]));
    }
  }, [isOpen, types]);

  useEffect(() => {
    if (isOpen) {
      setTypeId(null);
      setOtherOpen(false);
      setSportQuery('');
      setMinutes(45);
      setEffort('MODERATE');
      setRpe(null);
      setExercises([]);
      setCardio(EMPTY_CARDIO);
      setRoutineId(null);
    }
  }, [isOpen]);

  /** Tus deportes: los que más usas (120 días); si no hay historial, los de siempre. */
  const favorites = useMemo(() => {
    if (!types) return [];
    const used = types
      .filter((t) => (t.myUses ?? 0) > 0)
      .sort((a, b) => (b.myUses ?? 0) - (a.myUses ?? 0))
      .slice(0, FAVORITES);
    for (const code of DEFAULT_CODES) {
      if (used.length >= FAVORITES) break;
      const t = types.find((x) => x.code === code);
      if (t && !used.includes(t)) used.push(t);
    }
    return used;
  }, [types]);
  // Al abrir, el que más usas ya viene elegido.
  useEffect(() => {
    if (isOpen && !typeId && favorites[0]) setTypeId(favorites[0].id);
  }, [isOpen, typeId, favorites]);

  const results = useMemo(() => {
    if (!types) return [];
    const q = norm(sportQuery.trim());
    if (!q)
      return SUGGESTED_CODES.map((c) => types.find((t) => t.code === c)).filter(
        (t): t is ActivityType => !!t && !favorites.includes(t),
      );
    return types
      .filter((t) => norm(t.name).includes(q))
      .sort((a, b) => (b.myUses ?? 0) - (a.myUses ?? 0) || a.name.localeCompare(b.name, 'es'))
      .slice(0, 8);
  }, [types, sportQuery, favorites]);
  const selected = useMemo(() => types?.find((t) => t.id === typeId) ?? null, [types, typeId]);
  const pickedOther = selected && !favorites.includes(selected) ? selected : null;

  const isStrength = selected?.kind === 'STRENGTH';
  const isCardio = !!selected && CARDIO_KINDS.includes(selected.kind);
  const weight = profile?.currentWeightKg ?? null;
  const estimate =
    selected && weight
      ? Math.round(((selected.met * 3.5 * weight) / 200) * minutes * EFFORT_FACTOR[effort] / 5) * 5
      : null;
  const timezone = profile?.timezone ?? 'Europe/Madrid';
  const isToday = day === todayIn(timezone);

  /** Rellena el registro con la rutina: tipo, duración y, en gimnasio, sus series. */
  function logHere(r: Routine) {
    setRoutineId(r.id);
    const code = ROUTINE_KINDS.find((k) => k.value === r.kind)?.activityCode ?? null;
    const t = (types ?? []).find((x) => x.code === code) ?? (types ?? []).find((x) => x.kind === r.kind);
    if (t) setTypeId(t.id);
    if (r.plannedDurationMin) setMinutes(Math.min(300, Math.max(5, Math.round(r.plannedDurationMin / 5) * 5)));
    setExercises(r.kind === 'STRENGTH' ? workoutDraftFrom(r) : []);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const session = await brioApi.logActivity({
        activityTypeId: selected.id,
        ...(routineId ? { routineId } : {}),
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
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="rk-modal-full" {...SWIPE_TO_CLOSE}>
      <IonContent>
        <div className="rk-sheet workout">
          <span className="rk-grab" aria-hidden="true" />
          <SheetBar title="Registrar entreno" onCancel={onClose} />

          <div className="workout__info">
            <Icon d={PATHS.info} size={20} />
            <span>Si entrenaste con el reloj o con Hevy, no hace falta: se importará solo cuando los conectes.</span>
          </div>

          <RoutinePick
            selectedId={routineId}
            onSelect={(r) => setRoutineId(r?.id ?? null)}
            onLogHere={logHere}
            onDone={onClose}
          />

          <section className="rk-section" aria-labelledby="tipo">
            <SectionHeader id="tipo">Tipo</SectionHeader>
            <div className="workout__types">
              {favorites.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={typeId === t.id}
                  className="workout__type"
                  onClick={() => {
                    setTypeId(t.id);
                    setOtherOpen(false);
                  }}
                >
                  <Icon d={iconFor(t)} size={22} />
                  <span>{t.name}</span>
                </button>
              ))}
              <button
                type="button"
                aria-pressed={!!pickedOther || otherOpen}
                className="workout__type"
                onClick={() => setOtherOpen((v) => !v)}
              >
                <Icon d={pickedOther ? iconFor(pickedOther) : PATHS.search} size={22} />
                <span>{pickedOther ? pickedOther.name : 'Otro deporte'}</span>
              </button>
            </div>
            {otherOpen ? (
              <div className="workout__others" role="group" aria-label="Otro deporte">
                <input
                  className="workout__search"
                  type="search"
                  value={sportQuery}
                  placeholder="Busca: fútbol 7, tenis, natación…"
                  aria-label="Buscar deporte"
                  onChange={(e) => setSportQuery(e.target.value)}
                />
                {sportQuery.trim() && results.length === 0 ? (
                  <p className="workout__none">No está. Elige el más parecido.</p>
                ) : null}
                {results.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={typeId === t.id}
                    className="workout__chip"
                    onClick={() => {
                      setTypeId(t.id);
                      setOtherOpen(false);
                      setSportQuery('');
                    }}
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
