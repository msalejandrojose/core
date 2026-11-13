import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonContent, IonPage, useIonAlert } from '@ionic/react';
import { ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import { isApiError, brioApi, type ActivitySession } from '../api';
import { formatKcal, longDate } from '../format';
import { useBrioStore } from '../brio.store';
import { CardioFields, StrengthEditor } from '../sheets/WorkoutDetails';
import {
  cardioDraftFromSession,
  cardioPatch,
  draftsFromSets,
  exercisesBody,
  type DraftCardio,
  type DraftExercise,
} from '../sheets/workout-draft';
import { SectionHeader, Stepper } from '../ui/kit';
import { perfApi } from './perf.api';
import '../sheets/sheets.css';
import './performance.css';

const CARDIO_KINDS = ['RUN', 'CYCLE', 'WALK', 'HIKE', 'SWIM', 'ELLIPTICAL', 'OTHER_CARDIO'];

/**
 * Ver y editar un entreno guardado, de cualquier día: duración, esfuerzo,
 * datos de cardio, series y notas. También permite borrarlo. Los análisis de
 * rendimiento se recalculan solos con el cambio.
 */
export default function SessionEditPage() {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const [confirm] = useIonAlert();
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [failed, setFailed] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [cardio, setCardio] = useState<DraftCardio | null>(null);
  const [drafts, setDrafts] = useState<DraftExercise[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([perfApi.session(id), perfApi.exercises()])
      .then(([s, catalog]) => {
        if (!alive) return;
        setSession(s);
        setMinutes(String(Math.round(s.durationSec / 60)));
        setRpe(s.rpe ?? null);
        setNotes(s.notes ?? '');
        setCardio(cardioDraftFromSession(s));
        setDrafts(draftsFromSets(s.sets ?? [], catalog));
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);

  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/progress/rendimiento/entrenos'));
  const isStrength = session?.kind === 'STRENGTH';
  const isCardio = !!session?.kind && CARDIO_KINDS.includes(session.kind);
  const min = Number(minutes);
  const valid = Number.isInteger(min) && min >= 1 && min <= 720;

  async function save() {
    if (!session || !valid) return;
    setSaving(true);
    try {
      await perfApi.updateSession(id, {
        durationSec: min * 60,
        rpe,
        notes: notes.trim() || null,
        ...(isCardio && cardio ? cardioPatch(cardio) : {}),
      });
      if (isStrength && drafts) await perfApi.replaceSets(id, exercisesBody(drafts));
      // Si el entreno es del día abierto en Hoy, que se vea el cambio al volver.
      void refreshDay();
      toast.success('Entreno guardado', 'Tu rendimiento se recalcula con el cambio.');
      back();
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    void confirm({
      header: '¿Borrar este entreno?',
      message: 'Se borra con sus series. No se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Borrar',
          role: 'destructive',
          handler: () => {
            brioApi
              .deleteActivity(id)
              .then(() => {
                void refreshDay();
                toast.success('Entreno borrado');
                back();
              })
              .catch(() => toast.error('No se pudo borrar'));
          },
        },
      ],
    });
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet workout">
          <div className="rk-sheetbar">
            <button type="button" className="rk-textbtn" onClick={back}>
              Cancelar
            </button>
            <span className="rk-sheetbar__title">Editar entreno</span>
            <button
              type="button"
              className="rk-textbtn rk-textbtn--strong rk-sheetbar__end"
              disabled={!session || !valid || saving}
              onClick={() => void save()}
            >
              Guardar
            </button>
          </div>

          {failed ? (
            <div className="rk-card">
              <ErrorState message="No se pudo cargar el entreno." />
            </div>
          ) : !session || !cardio || !drafts ? (
            <SkeletonList rows={4} />
          ) : (
            <>
              <div className="rk-list">
                <div className="rk-row">
                  <span className="rk-row__main">
                    <span className="rk-row__title">{session.activityTypeName}</span>
                    <span className="rk-row__sub">{longDate(session.loggedOn)}</span>
                  </span>
                  <span className="rk-row__value">{formatKcal(session.kcalBurned)} kcal</span>
                </div>
                <div className="rk-row workout__row">
                  <span className="rk-row__main rk-row__title">Duración</span>
                  <label className="workout__num">
                    <span className="rk-visually-hidden">Duración en minutos</span>
                    <input type="text" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} />
                  </label>
                  <span className="workout__unit">min</span>
                </div>
                <div className="rk-row workout__row">
                  <span className="rk-row__main">
                    <span className="rk-row__title">Esfuerzo (RPE)</span>
                    <span className="rk-row__sub">{rpe === null ? 'Sin apuntar' : 'De 1, muy fácil, a 10, máximo'}</span>
                  </span>
                  <Stepper
                    value={rpe ?? '—'}
                    minusLabel="Un punto menos de esfuerzo"
                    plusLabel="Un punto más de esfuerzo"
                    onMinus={() => setRpe((r) => (r === null ? 5 : r <= 1 ? null : r - 1))}
                    onPlus={() => setRpe((r) => Math.min(10, (r ?? 4) + 1))}
                  />
                </div>
              </div>
              <p className="rk-note">Si cambias la duración, las calorías se vuelven a estimar con tu peso actual.</p>

              {isCardio ? <CardioFields value={cardio} onChange={setCardio} /> : null}
              {isStrength ? <StrengthEditor value={drafts} onChange={setDrafts} /> : null}

              <section className="rk-section" aria-labelledby="notas">
                <SectionHeader id="notas">Notas</SectionHeader>
                <textarea
                  className="perf__notes"
                  aria-labelledby="notas"
                  value={notes}
                  maxLength={500}
                  rows={3}
                  placeholder="Sensaciones, recorrido, lo que quieras recordar"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </section>

              <button type="button" className="perf__delete" onClick={remove}>
                Borrar entreno
              </button>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
