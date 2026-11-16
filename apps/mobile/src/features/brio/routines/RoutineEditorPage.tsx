import { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { MUSCLE_NAME } from '../performance/labels';
import { BackLink, LargeTitle, NavRow, SectionHeader, Segmented, Stepper } from '../ui/kit';
import { ExercisePicker } from './ExercisePicker';
import {
  EMPTY_ROUTINE,
  ROUTINE_KINDS,
  draftFrom,
  musclesOf,
  routineBody,
  type RoutineDraft,
  type RoutineDraftExercise,
} from './routine-draft';
import { routineErrorText, routinesApi } from './routines.api';
import '../sheets/sheets.css';
import './routines.css';

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
}) {
  return (
    <label className="rk-row routine__field">
      <span className="rk-row__main rk-row__title">{label}</span>
      <input
        type="text"
        inputMode={inputMode ?? 'text'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Crear o editar una rutina: nombre, tipo y, en gimnasio, ejercicios con series y peso. */
export default function RoutineEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id || id === 'nueva';
  const history = useHistory();
  const [draft, setDraft] = useState<RoutineDraft | null>(isNew ? EMPTY_ROUTINE : null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    routinesApi
      .get(id)
      .then((r) => alive && setDraft(draftFrom(r)))
      .catch(() => {
        toast.error('No se encontró la rutina');
        history.replace('/tabs/settings/rutinas');
      });
    return () => {
      alive = false;
    };
  }, [id, isNew, history]);

  const muscles = useMemo(() => musclesOf(draft?.exercises ?? []), [draft?.exercises]);

  if (!draft) {
    return (
      <IonPage>
        <IonContent>
          <div className="rk-screen">
            <p className="rk-note">Cargando…</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const set = (changes: Partial<RoutineDraft>) => setDraft({ ...draft, ...changes });
  const patch = (i: number, changes: Partial<RoutineDraftExercise>) =>
    set({ exercises: draft.exercises.map((e, j) => (j === i ? { ...e, ...changes } : e)) });
  const move = (i: number, by: number) => {
    const next = [...draft.exercises];
    const [it] = next.splice(i, 1);
    next.splice(Math.max(0, Math.min(next.length, i + by)), 0, it);
    set({ exercises: next });
  };
  const strength = draft.kind === 'STRENGTH';
  const canSave = !!draft.name.trim() && (!strength || draft.exercises.length > 0);

  async function save() {
    if (!draft || !canSave) return;
    setSaving(true);
    try {
      const body = routineBody(draft);
      if (isNew) await routinesApi.create(body);
      else await routinesApi.update(id, body);
      toast.success(isNew ? 'Rutina creada' : 'Rutina guardada');
      history.replace('/tabs/settings/rutinas');
    } catch (e) {
      toast.error('No se pudo guardar', routineErrorText(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew) return;
    setSaving(true);
    try {
      await routinesApi.remove(id);
      toast.success('Rutina quitada', 'Los entrenos que hiciste con ella se quedan.');
      history.replace('/tabs/settings/rutinas');
    } catch (e) {
      toast.error('No se pudo quitar', routineErrorText(e));
      setSaving(false);
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen routine">
          <NavRow
            back={<BackLink label="Rutinas" fallback="/tabs/settings/rutinas" />}
            actions={
              <button type="button" className="rk-textbtn rk-textbtn--strong" disabled={!canSave || saving} onClick={() => void save()}>
                Guardar
              </button>
            }
          />
          <LargeTitle>{isNew ? 'Nueva rutina' : draft.name || 'Rutina'}</LargeTitle>

          <div className="rk-list">
            <TextField label="Nombre" value={draft.name} onChange={(v) => set({ name: v })} placeholder={strength ? 'Torso A' : 'Rodaje Z2'} />
          </div>

          <section className="rk-section" aria-labelledby="tipo">
            <SectionHeader id="tipo">Tipo</SectionHeader>
            <div className="routine__kinds" role="group" aria-label="Tipo de rutina">
              {ROUTINE_KINDS.map((k) => (
                <button key={k.value} type="button" className="workout__chip" aria-pressed={draft.kind === k.value} onClick={() => set({ kind: k.value })}>
                  {k.label}
                </button>
              ))}
            </div>
            <p className="rk-note">
              {strength
                ? 'Las de gimnasio se mandan a Hevy con sus ejercicios y pesos. Al acabar en Hevy, el entreno vuelve solo a Brío.'
                : 'Las de cardio las haces con el reloj. Al acabar, Brío trae el entreno de Garmin y lo enlaza con la rutina.'}
            </p>
          </section>

          {strength ? (
            <section className="rk-section" aria-labelledby="ej">
              <SectionHeader id="ej">Ejercicios</SectionHeader>

              {muscles.length ? (
                <div className="routine__muscles routine__muscles--big" aria-label="Músculos que trabaja">
                  {muscles
                    .filter((m) => m.share >= 0.05)
                    .map((m) => (
                      <span key={m.muscle} className={`routine__muscle${m.primary ? ' is-main' : ''}`}>
                        {MUSCLE_NAME[m.muscle] ?? m.muscle} {Math.round(m.share * 100)} %
                      </span>
                    ))}
                </div>
              ) : null}

              {draft.exercises.map((e, i) => (
                <div key={`${e.exerciseId}-${i}`} className="rk-list routine__exercise">
                  <div className="rk-row">
                    <span className="routine__n" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="rk-row__main">
                      <span className="rk-row__title">{e.name}</span>
                      <span className="rk-row__sub">
                        {e.muscles
                          .filter((m) => m.weight >= 1)
                          .map((m) => MUSCLE_NAME[m.muscle] ?? m.muscle)
                          .join(', ')}
                      </span>
                    </span>
                    <div className="routine__order">
                      <button type="button" aria-label={`Subir ${e.name}`} disabled={i === 0} onClick={() => move(i, -1)}>
                        ↑
                      </button>
                      <button type="button" aria-label={`Bajar ${e.name}`} disabled={i === draft.exercises.length - 1} onClick={() => move(i, 1)}>
                        ↓
                      </button>
                    </div>
                  </div>
                  <div className="rk-row routine__line">
                    <span className="rk-row__main rk-row__title">Series</span>
                    <Stepper
                      value={e.sets}
                      minusLabel="Una serie menos"
                      plusLabel="Una serie más"
                      onMinus={() => patch(i, { sets: Math.max(1, e.sets - 1) })}
                      onPlus={() => patch(i, { sets: Math.min(20, e.sets + 1) })}
                    />
                  </div>
                  <div className="rk-row routine__line">
                    <span className="rk-row__main rk-row__title">Repeticiones</span>
                    <Stepper
                      value={e.reps}
                      minusLabel="Una repetición menos"
                      plusLabel="Una repetición más"
                      onMinus={() => patch(i, { reps: Math.max(1, e.reps - 1) })}
                      onPlus={() => patch(i, { reps: Math.min(100, e.reps + 1) })}
                    />
                  </div>
                  <label className="rk-row routine__line routine__field">
                    <span className="rk-row__main rk-row__title">{e.bodyweight ? 'Lastre (kg)' : 'Peso (kg)'}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={e.weight}
                      placeholder="—"
                      onChange={(ev) => patch(i, { weight: ev.target.value.replace(/[^0-9.,]/g, '') })}
                    />
                  </label>
                  <label className="rk-row routine__line routine__field">
                    <span className="rk-row__main rk-row__title">Descanso (s)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={e.rest}
                      placeholder="—"
                      onChange={(ev) => patch(i, { rest: ev.target.value.replace(/[^0-9]/g, '') })}
                    />
                  </label>
                  <button type="button" className="rk-row routine__remove" onClick={() => set({ exercises: draft.exercises.filter((_, j) => j !== i) })}>
                    Quitar ejercicio
                  </button>
                </div>
              ))}

              {picking ? (
                <ExercisePicker
                  exclude={draft.exercises.map((e) => e.exerciseId)}
                  onCancel={() => setPicking(false)}
                  onPick={(ex) => {
                    set({
                      exercises: [
                        ...draft.exercises,
                        {
                          exerciseId: ex.id,
                          name: ex.name,
                          bodyweight: ex.isBodyweight,
                          muscles: ex.muscles,
                          sets: 3,
                          reps: 10,
                          weight: '',
                          rest: '90',
                        },
                      ],
                    });
                    setPicking(false);
                  }}
                />
              ) : (
                <button type="button" className="plan__btn routine__add-btn" onClick={() => setPicking(true)}>
                  Añadir ejercicio
                </button>
              )}
            </section>
          ) : (
            <section className="rk-section" aria-labelledby="obj">
              <SectionHeader id="obj">Objetivo</SectionHeader>
              <div className="rk-list">
                <TextField label="Duración (min)" value={draft.minutes} onChange={(v) => set({ minutes: v.replace(/[^0-9]/g, '') })} placeholder="45" inputMode="numeric" />
                <TextField label="Distancia (km)" value={draft.distanceKm} onChange={(v) => set({ distanceKm: v.replace(/[^0-9.,]/g, '') })} placeholder="—" inputMode="decimal" />
                <TextField label="Ritmo (min/km)" value={draft.pace} onChange={(v) => set({ pace: v.replace(/[^0-9:]/g, '') })} placeholder="5:30" />
              </div>
            </section>
          )}

          {strength ? (
            <section className="rk-section" aria-labelledby="dur">
              <SectionHeader id="dur">Duración aproximada</SectionHeader>
              <Segmented
                label="Duración aproximada"
                value={(['45', '60', '75', '90'].includes(draft.minutes) ? draft.minutes : '60') as '45' | '60' | '75' | '90'}
                onChange={(v) => set({ minutes: v })}
                options={['45', '60', '75', '90'].map((m) => ({ value: m as '45' | '60' | '75' | '90', label: `${m} min` }))}
              />
            </section>
          ) : null}

          <section className="rk-section" aria-labelledby="notas">
            <SectionHeader id="notas">Notas</SectionHeader>
            <textarea
              className="routine__notes"
              rows={3}
              maxLength={500}
              value={draft.notes}
              placeholder={strength ? 'Calentar con 2 series ligeras de press…' : '10 min suaves, 6×800 a 4:00, 10 min suaves'}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </section>

          <button type="button" className="rk-btn routine__save" disabled={!canSave || saving} onClick={() => void save()}>
            {isNew ? 'Crear rutina' : 'Guardar cambios'}
          </button>
          {!isNew ? (
            <button type="button" className="rk-textbtn routine__delete" disabled={saving} onClick={() => void remove()}>
              Quitar rutina
            </button>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
}
