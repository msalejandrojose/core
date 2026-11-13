import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ErrorState, SkeletonList } from '@/components/ux';
import type { ActivitySession } from '../api';
import { formatDuration, formatKcal, formatNumber, longDate } from '../format';
import { BackLink, Chevron, LargeTitle, NavRow, SectionHeader } from '../ui/kit';
import { perfApi } from './perf.api';
import { Empty } from './ui';
import '../progress/progress.css';
import './performance.css';

const PAGE = 30;

/** Resumen de una línea de lo que se hizo en la sesión. */
function detail(s: ActivitySession): string {
  const parts = [formatDuration(s.durationSec)];
  if (s.distanceM) parts.push(`${formatNumber(s.distanceM / 1000, 1)} km`);
  const working = (s.sets ?? []).filter((x) => !x.isWarmup).length;
  if (working) parts.push(`${working} series`);
  if (s.avgHeartRate) parts.push(`${s.avgHeartRate} ppm`);
  if (s.rpe) parts.push(`RPE ${s.rpe}`);
  parts.push(`${formatKcal(s.kcalBurned)} kcal`);
  return parts.join(' · ');
}

/** Historial de entrenos: todos los días, del más reciente al más antiguo. */
export default function HistoryPage() {
  const [sessions, setSessions] = useState<ActivitySession[] | null>(null);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load(before: string | null) {
    setLoading(true);
    setError(false);
    try {
      const page = await perfApi.history(before, PAGE);
      // Cursor: la página siguiente son los que empezaron antes del último
      // recibido, así que no se repite ni se salta ningún entreno.
      setSessions((cur) => (before && cur ? [...cur, ...page] : page));
      if (page.length < PAGE) setDone(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(null);
  }, []);

  const days = new Map<string, ActivitySession[]>();
  for (const s of sessions ?? []) days.set(s.loggedOn, [...(days.get(s.loggedOn) ?? []), s]);
  const last = sessions?.[sessions.length - 1]?.startedAt ?? null;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen perf">
          <NavRow back={<BackLink label="Rendimiento" fallback="/tabs/progress/rendimiento" />} />
          <LargeTitle sub="Toca uno para verlo o cambiarlo">Entrenos</LargeTitle>

          {error && !sessions ? (
            <div className="rk-card">
              <ErrorState message="No se pudo cargar el historial." onRetry={() => void load(null)} />
            </div>
          ) : sessions === null ? (
            <SkeletonList rows={5} />
          ) : !sessions.length ? (
            <Empty>Aún no has registrado ningún entreno. Hazlo con el +.</Empty>
          ) : (
            <>
              {[...days.entries()].map(([day, list]) => (
                <section key={day} className="rk-section">
                  <SectionHeader>{longDate(day)}</SectionHeader>
                  <div className="progress__list">
                    {list.map((s) => (
                      <Link key={s.id} to={`/tabs/progress/rendimiento/entrenos/${s.id}`} className="progress__link">
                        <span className="rk-row__main">
                          <span className="rk-row__title">{s.activityTypeName}</span>
                          <span className="rk-row__sub perf__wrap">{detail(s)}</span>
                        </span>
                        <Chevron />
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
              {done ? (
                <p className="rk-note">Este es tu primer entreno registrado.</p>
              ) : (
                <button type="button" className="rk-tilebtn workout__add-ex" disabled={loading} onClick={() => void load(last)}>
                  {loading ? 'Cargando…' : error ? 'Reintentar' : 'Ver entrenos anteriores'}
                </button>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
