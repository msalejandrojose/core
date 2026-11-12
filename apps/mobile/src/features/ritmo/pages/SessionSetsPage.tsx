import { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { formatDuration, timeIn } from '../format';
import { perfApi } from '../performance/perf.api';
import { useRitmoStore } from '../ritmo.store';
import { StrengthEditor } from '../sheets/WorkoutDetails';
import { draftsFromSets, exercisesBody, type DraftExercise } from '../sheets/workout-draft';
import '../sheets/sheets.css';

/**
 * Editar los ejercicios y series de un entreno de fuerza ya guardado. La API
 * sustituye todas las series de la sesión; los análisis de rendimiento se
 * recalculan solos en la siguiente consulta.
 */
export default function SessionSetsPage() {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const summary = useRitmoStore((s) => s.summary);
  const dayStatus = useRitmoStore((s) => s.dayStatus);
  const loadDay = useRitmoStore((s) => s.loadDay);
  const refreshDay = useRitmoStore((s) => s.refreshDay);
  const timezone = useRitmoStore((s) => s.profile?.timezone) ?? 'Europe/Madrid';
  const session = summary?.sessions.find((s) => s.id === id) ?? null;
  const [drafts, setDrafts] = useState<DraftExercise[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Entrando directamente por URL aún no hay día cargado.
  useEffect(() => {
    if (dayStatus === 'idle') void loadDay();
  }, [dayStatus, loadDay]);

  // El borrador se construye una vez, con los nombres del catálogo.
  useEffect(() => {
    if (!session || drafts !== null) return;
    perfApi
      .exercises()
      .then((catalog) => setDrafts(draftsFromSets(session.sets ?? [], catalog)))
      .catch(() => setFailed(true));
  }, [session, drafts]);

  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/today'));

  async function save() {
    if (!drafts) return;
    setSaving(true);
    try {
      await perfApi.replaceSets(id, exercisesBody(drafts));
      await refreshDay();
      toast.success('Series guardadas', 'Tu rendimiento se recalcula con el cambio.');
      back();
    } catch (e) {
      toast.error('No se pudieron guardar las series', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const missing = dayStatus === 'ready' && !session;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet workout">
          <div className="rk-sheetbar">
            <button type="button" className="rk-textbtn" onClick={back}>
              Cancelar
            </button>
            <span className="rk-sheetbar__title">Editar series</span>
            <button
              type="button"
              className="rk-textbtn rk-textbtn--strong rk-sheetbar__end"
              disabled={!drafts || saving}
              onClick={() => void save()}
            >
              Guardar
            </button>
          </div>

          {failed || dayStatus === 'error' ? (
            <div className="rk-card">
              <ErrorState message="No se pudo cargar el entreno." />
            </div>
          ) : missing ? (
            <p className="rk-card rk-note">Este entreno no es del día que tienes abierto. Vuelve a Hoy y ábrelo desde su día.</p>
          ) : !session || !drafts ? (
            <SkeletonList rows={3} />
          ) : (
            <>
              <div className="rk-list">
                <div className="rk-row">
                  <span className="rk-row__main rk-row__title">{session.activityTypeName}</span>
                  <span className="rk-row__value">
                    {timeIn(session.startedAt, timezone)} · {formatDuration(session.durationSec)}
                  </span>
                </div>
              </div>
              <StrengthEditor value={drafts} onChange={setDrafts} />
              <p className="rk-note">Al guardar se sustituyen todas las series de este entreno. Las series incompletas no se guardan.</p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
