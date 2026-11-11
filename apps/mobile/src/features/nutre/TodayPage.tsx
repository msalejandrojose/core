import { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonToolbar,
} from '@ionic/react';
import {
  addOutline,
  barbellOutline,
  chevronBackOutline,
  chevronForwardOutline,
  restaurantOutline,
  scaleOutline,
  trashOutline,
} from 'ionicons/icons';
import { nutreApi, type MealType } from './api';
import {
  MEAL_ORDER,
  dayLabel,
  formatDistance,
  formatDuration,
  formatKcal,
  mealLabel,
  todayIn,
} from './format';
import { useNutreStore } from './nutre.store';
import { KcalRing } from './KcalRing';
import { MacroBars } from './MacroBars';
import { LogMealSheet } from './LogMealSheet';
import { LogActivitySheet } from './LogActivitySheet';
import { LogWeightSheet } from './LogWeightSheet';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import './nutre.css';

/**
 * Pantalla principal: el día. Es la que se abre al entrar en la app, así que
 * carga de UNA llamada (`GET /nutre/day`) y se puede navegar a días anteriores
 * sin salir de aquí.
 *
 * Las acciones de registro van en un FAB abajo a la derecha, en la zona del
 * pulgar (DS §1b), y abren sheets en vez de páginas nuevas.
 */
export default function TodayPage() {
  const profile = useNutreStore((s) => s.profile);
  const profileStatus = useNutreStore((s) => s.profileStatus);
  const needsOnboarding = useNutreStore((s) => s.needsOnboarding);
  const day = useNutreStore((s) => s.day);
  const summary = useNutreStore((s) => s.summary);
  const dayStatus = useNutreStore((s) => s.dayStatus);
  const loadProfile = useNutreStore((s) => s.loadProfile);
  const loadDay = useNutreStore((s) => s.loadDay);
  const refreshDay = useNutreStore((s) => s.refreshDay);
  const stepDay = useNutreStore((s) => s.stepDay);

  const [mealSheet, setMealSheet] = useState<MealType | null>(null);
  const [activitySheet, setActivitySheet] = useState(false);
  const [weightSheet, setWeightSheet] = useState(false);

  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  useEffect(() => {
    if (profileStatus === 'ready' && !needsOnboarding && dayStatus === 'idle') {
      void loadDay();
    }
  }, [profileStatus, needsOnboarding, dayStatus, loadDay]);

  // Sin perfil no hay objetivo ni día que mostrar: el onboarding es la
  // pantalla, no un banner dentro de ella.
  if (profileStatus === 'ready' && needsOnboarding) {
    return <Redirect to="/tabs/today/onboarding" />;
  }

  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const isToday = day === today;

  async function removeMeal(id: string) {
    try {
      await nutreApi.deleteMeal(id);
      await refreshDay();
    } catch {
      toast.error('No se pudo borrar la entrada');
    }
  }

  async function removeSession(id: string) {
    try {
      await nutreApi.deleteActivity(id);
      await refreshDay();
    } catch {
      toast.error('No se pudo borrar la actividad');
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton
              aria-label="Día anterior"
              onClick={() => void stepDay(-1)}
            >
              <IonIcon slot="icon-only" icon={chevronBackOutline} />
            </IonButton>
          </IonButtons>

          <div className="nutre-daynav">
            <span className="nutre-daynav__label">
              {dayLabel(day, today)}
            </span>
          </div>

          <IonButtons slot="end">
            <IonButton
              aria-label="Día siguiente"
              disabled={isToday}
              onClick={() => void stepDay(1)}
            >
              <IonIcon slot="icon-only" icon={chevronForwardOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            await Promise.all([loadProfile(), refreshDay()]);
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>

        {dayStatus === 'error' ? (
          <ErrorState
            message="No se pudo cargar el día."
            onRetry={() => void loadDay()}
          />
        ) : summary === null ? (
          <div className="ion-padding">
            <SkeletonList rows={5} />
          </div>
        ) : (
          <>
            <div className="nutre-hero">
              <KcalRing totals={summary.totals} />
              <div className="nutre-balance">
                <div className="nutre-balance__row">
                  <span className="nutre-balance__label">Comido</span>
                  <span className="nutre-balance__value">
                    {formatKcal(summary.totals.kcalIn)}
                  </span>
                </div>
                <div className="nutre-balance__row">
                  <span className="nutre-balance__label">Ejercicio</span>
                  <span className="nutre-balance__value">
                    {formatKcal(summary.totals.kcalBurned)}
                  </span>
                </div>
                <div className="nutre-balance__row">
                  <span className="nutre-balance__label">Objetivo</span>
                  <span className="nutre-balance__value">
                    {summary.totals.kcalTarget === null
                      ? '—'
                      : formatKcal(summary.totals.kcalTarget)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 16px' }}>
              <div className="core-card">
                <MacroBars totals={summary.totals} profile={profile} />
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {MEAL_ORDER.map((type) => {
                const entries = summary.meals.filter(
                  (m) => m.mealType === type,
                );
                const kcal = entries.reduce((sum, m) => sum + m.kcal, 0);
                return (
                  <section key={type} style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                      }}
                    >
                      <p className="core-section-label">{mealLabel(type)}</p>
                      <p className="core-section-label">
                        {entries.length > 0 ? formatKcal(kcal) : ''}
                      </p>
                    </div>

                    <div className="core-group">
                      {entries.map((entry) => (
                        <div key={entry.id} className="nutre-entry">
                          <div className="nutre-entry__body">
                            <div className="nutre-entry__name">
                              {entry.name}
                            </div>
                            <div className="nutre-entry__meta">
                              {Math.round(entry.quantityG)} g · P{' '}
                              {Math.round(entry.proteinG)} · H{' '}
                              {Math.round(entry.carbsG)} · G{' '}
                              {Math.round(entry.fatG)}
                            </div>
                          </div>
                          <span className="nutre-entry__kcal">
                            {formatKcal(entry.kcal)}
                          </span>
                          <IonButton
                            fill="clear"
                            size="small"
                            aria-label={`Borrar ${entry.name}`}
                            onClick={() => void removeMeal(entry.id)}
                          >
                            <IonIcon
                              slot="icon-only"
                              icon={trashOutline}
                              style={{ color: 'var(--core-muted)' }}
                            />
                          </IonButton>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="nutre-entry"
                        style={{
                          width: '100%',
                          background: 'none',
                          border: 0,
                          cursor: 'pointer',
                        }}
                        onClick={() => setMealSheet(type)}
                      >
                        <span className="core-tint-icon">
                          <IonIcon icon={addOutline} aria-hidden="true" />
                        </span>
                        <span
                          className="nutre-entry__body"
                          style={{ color: 'var(--ion-color-primary)' }}
                        >
                          Añadir
                        </span>
                      </button>
                    </div>
                  </section>
                );
              })}

              <section>
                <p className="core-section-label">Actividad</p>
                {summary.sessions.length === 0 ? (
                  <div className="core-group">
                    <EmptyState
                      icon={barbellOutline}
                      title="Sin actividad este día"
                      description="Registra un entreno para sumar calorías gastadas."
                      actionLabel="Añadir actividad"
                      onAction={() => setActivitySheet(true)}
                    />
                  </div>
                ) : (
                  <div className="core-group">
                    {summary.sessions.map((session) => (
                      <div key={session.id} className="nutre-entry">
                        <span className="core-tint-icon core-tint-icon--purple">
                          <IonIcon icon={barbellOutline} aria-hidden="true" />
                        </span>
                        <div className="nutre-entry__body">
                          <div className="nutre-entry__name">
                            {session.activityTypeName}
                          </div>
                          <div className="nutre-entry__meta">
                            {formatDuration(session.durationSec)}
                            {session.distanceM
                              ? ` · ${formatDistance(session.distanceM)}`
                              : ''}
                          </div>
                        </div>
                        <span className="nutre-entry__kcal">
                          −{formatKcal(session.kcalBurned)}
                        </span>
                        <IonButton
                          fill="clear"
                          size="small"
                          aria-label={`Borrar ${session.activityTypeName}`}
                          onClick={() => void removeSession(session.id)}
                        >
                          <IonIcon
                            slot="icon-only"
                            icon={trashOutline}
                            style={{ color: 'var(--core-muted)' }}
                          />
                        </IonButton>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        <IonFab slot="fixed" vertical="bottom" horizontal="end">
          <IonFabButton aria-label="Añadir registro">
            <IonIcon icon={addOutline} />
          </IonFabButton>
          <IonFabList side="top">
            <IonFabButton
              aria-label="Añadir comida"
              onClick={() => setMealSheet('LUNCH')}
            >
              <IonIcon icon={restaurantOutline} />
            </IonFabButton>
            <IonFabButton
              aria-label="Añadir actividad"
              onClick={() => setActivitySheet(true)}
            >
              <IonIcon icon={barbellOutline} />
            </IonFabButton>
            <IonFabButton
              aria-label="Registrar peso"
              onClick={() => setWeightSheet(true)}
            >
              <IonIcon icon={scaleOutline} />
            </IonFabButton>
          </IonFabList>
        </IonFab>

        <LogMealSheet
          isOpen={mealSheet !== null}
          initialMealType={mealSheet ?? 'LUNCH'}
          onClose={() => setMealSheet(null)}
        />
        <LogActivitySheet
          isOpen={activitySheet}
          onClose={() => setActivitySheet(false)}
        />
        <LogWeightSheet
          isOpen={weightSheet}
          onClose={() => setWeightSheet(false)}
        />
      </IonContent>
    </IonPage>
  );
}
