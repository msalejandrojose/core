import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { trendingDownOutline } from 'ionicons/icons';
import { ritmoApi, type Progress } from './api';
import { formatKcal, formatNumber, formatWeight } from './format';
import { useRitmoStore } from './ritmo.store';
import { WeightChart } from './WeightChart';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ux';
import './ritmo.css';

const WINDOWS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

/**
 * Progreso: evolución del peso y balance calórico medio en una ventana.
 *
 * La media de kcal se calcula solo sobre los días CON registros: incluir los
 * días vacíos como 0 kcal daría una media falsamente baja y haría pensar que se
 * está en déficit cuando lo que pasó es que no se registró nada.
 */
export default function ProgressPage() {
  const history = useHistory();
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);

  const [days, setDays] = useState(30);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  const load = (window: number) => {
    setFailed(false);
    setProgress(null);
    ritmoApi
      .getProgress(window)
      .then(setProgress)
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    load(days);
  }, [days]);

  const weights = progress?.weights ?? [];
  const first = weights[0]?.weightKg;
  const last = weights[weights.length - 1]?.weightKg;
  const delta = first !== undefined && last !== undefined ? last - first : null;

  const loggedDays = (progress?.days ?? []).filter((d) => d.kcalIn > 0);
  const avgKcal =
    loggedDays.length > 0
      ? loggedDays.reduce((sum, d) => sum + d.kcalIn, 0) / loggedDays.length
      : null;
  const avgBurned =
    loggedDays.length > 0
      ? loggedDays.reduce((sum, d) => sum + d.kcalBurned, 0) / loggedDays.length
      : null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Progreso</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/tabs/progress/goal')}>
              Objetivo
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            load(days);
            await loadProfile();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        <IonSegment
          className="core-segment"
          value={String(days)}
          onIonChange={(e) => setDays(Number(e.detail.value))}
        >
          {WINDOWS.map((w) => (
            <IonSegmentButton key={w.days} value={String(w.days)}>
              {w.label}
            </IonSegmentButton>
          ))}
        </IonSegment>

        {failed ? (
          <ErrorState
            message="No se pudo cargar tu progreso."
            onRetry={() => load(days)}
          />
        ) : progress === null ? (
          <div style={{ marginTop: 24 }}>
            <SkeletonList rows={4} />
          </div>
        ) : (
          <>
            <p className="core-section-label" style={{ marginTop: 28 }}>
              Peso
            </p>
            <div className="core-card">
              {weights.length === 0 ? (
                <EmptyState
                  icon={trendingDownOutline}
                  title="Aún no hay pesadas"
                  description="Registra tu peso desde la pantalla de hoy para ver la evolución."
                />
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <span className="core-title" style={{ fontSize: 24 }}>
                      {formatWeight(last as number)}
                    </span>
                    {delta !== null && weights.length > 1 ? (
                      <span
                        style={{
                          fontSize: 15,
                          color:
                            delta === 0
                              ? 'var(--ritmo-ink-muted)'
                              : 'var(--ritmo-sleep-ink)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {delta > 0 ? '+' : ''}
                        {formatNumber(Math.round(delta * 10) / 10, 1)} kg
                      </span>
                    ) : null}
                  </div>
                  {weights.length > 1 ? (
                    <WeightChart
                      points={weights}
                      targetKg={profile?.targetWeightKg ?? null}
                    />
                  ) : (
                    // Un solo punto no es una tendencia: mejor decirlo que
                    // dibujar un punto suelto en mitad de la tarjeta.
                    <p className="ritmo-entry__meta" style={{ margin: 0 }}>
                      Registra otra pesada para ver la evolución.
                    </p>
                  )}
                </>
              )}
            </div>

            <p className="core-section-label" style={{ marginTop: 28 }}>
              Media diaria
            </p>
            <div className="core-group">
              <div className="ritmo-entry">
                <div className="ritmo-entry__body">
                  <div className="ritmo-entry__name">Calorías comidas</div>
                  <div className="ritmo-entry__meta">
                    {loggedDays.length === 1
                      ? '1 día con registro'
                      : `${loggedDays.length} días con registro`}
                  </div>
                </div>
                <span className="ritmo-entry__kcal">
                  {avgKcal === null ? '—' : formatKcal(avgKcal)}
                </span>
              </div>
              <div className="ritmo-entry">
                <div className="ritmo-entry__body">
                  <div className="ritmo-entry__name">Calorías gastadas</div>
                  <div className="ritmo-entry__meta">Solo actividad registrada</div>
                </div>
                <span className="ritmo-entry__kcal">
                  {avgBurned === null ? '—' : formatKcal(avgBurned)}
                </span>
              </div>
              <div className="ritmo-entry">
                <div className="ritmo-entry__body">
                  <div className="ritmo-entry__name">Objetivo</div>
                  <div className="ritmo-entry__meta">
                    {profile?.tdeeKcal
                      ? `Gasto estimado ${formatKcal(profile.tdeeKcal)} kcal`
                      : 'Sin calcular'}
                  </div>
                </div>
                <span className="ritmo-entry__kcal">
                  {profile?.dailyKcalTarget
                    ? formatKcal(profile.dailyKcalTarget)
                    : '—'}
                </span>
              </div>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
}
