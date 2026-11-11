import { useEffect } from 'react';
import { Redirect } from 'react-router-dom';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
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
  notificationsOutline,
  personCircle,
  trashOutline,
} from 'ionicons/icons';
import { ritmoApi } from './api';
import {
  MEAL_ORDER,
  dayLabel,
  formatDistance,
  formatDuration,
  formatGrams,
  formatKcal,
  longDate,
  mealLabel,
  todayIn,
} from './format';
import { useRitmoStore } from './ritmo.store';
import { useRegisterStore } from './register.store';
import { KcalRing } from './KcalRing';
import { MacroBars } from './MacroBars';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ux';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { toast } from '@/lib/toast';
import './ritmo.css';

/**
 * Pantalla principal: el día. Es la que se abre al entrar en la app, así que
 * carga de UNA llamada (`GET /ritmo/day`) y se puede navegar a días anteriores
 * sin salir de aquí.
 *
 * Cabecera del diseño: fecha en kicker, título grande y, a la derecha, la
 * campana de avisos y el avatar (que sustituyen a las antiguas pestañas de
 * Notificaciones y Ajustes). Registrar se hace con el + de la tab bar o con
 * "Añadir" en cada comida; las hojas viven en el shell.
 */
export default function TodayPage() {
  const profile = useRitmoStore((s) => s.profile);
  const profileStatus = useRitmoStore((s) => s.profileStatus);
  const needsOnboarding = useRitmoStore((s) => s.needsOnboarding);
  const day = useRitmoStore((s) => s.day);
  const summary = useRitmoStore((s) => s.summary);
  const dayStatus = useRitmoStore((s) => s.dayStatus);
  const loadProfile = useRitmoStore((s) => s.loadProfile);
  const loadDay = useRitmoStore((s) => s.loadDay);
  const refreshDay = useRitmoStore((s) => s.refreshDay);
  const stepDay = useRitmoStore((s) => s.stepDay);
  const openRegister = useRegisterStore((s) => s.open);
  const unread = useUnreadStore((s) => s.unread);

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
      await ritmoApi.deleteMeal(id);
      await refreshDay();
    } catch {
      toast.error('No se pudo borrar la entrada');
    }
  }

  async function removeSession(id: string) {
    try {
      await ritmoApi.deleteActivity(id);
      await refreshDay();
    } catch {
      toast.error('No se pudo borrar el entreno');
    }
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton
              routerLink="/tabs/notifications"
              aria-label={unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos'}
              className="ritmo-header-icon"
            >
              <IonIcon slot="icon-only" icon={notificationsOutline} />
              {unread > 0 ? (
                <IonBadge className="ritmo-header-badge">
                  {unread > 99 ? '99+' : unread}
                </IonBadge>
              ) : null}
            </IonButton>
            <IonButton
              routerLink="/tabs/settings"
              aria-label="Perfil y ajustes"
              className="ritmo-header-icon ritmo-header-avatar"
            >
              <IonIcon slot="icon-only" icon={personCircle} />
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

        <div className="ritmo-screen ritmo-screen--today">
          <header className="ritmo-page-head">
            <span className="ritmo-kicker">{longDate(day)}</span>
            <div className="ritmo-page-head__row">
              <h1 className="ritmo-large-title">{dayLabel(day, today)}</h1>
              <div className="ritmo-daynav">
                <IonButton
                  fill="clear"
                  aria-label="Día anterior"
                  onClick={() => void stepDay(-1)}
                >
                  <IonIcon slot="icon-only" icon={chevronBackOutline} />
                </IonButton>
                <IonButton
                  fill="clear"
                  aria-label="Día siguiente"
                  disabled={isToday}
                  onClick={() => void stepDay(1)}
                >
                  <IonIcon slot="icon-only" icon={chevronForwardOutline} />
                </IonButton>
              </div>
            </div>
          </header>

          {dayStatus === 'error' ? (
            <ErrorState
              message="No se pudo cargar el día."
              onRetry={() => void loadDay()}
            />
          ) : summary === null ? (
            <SkeletonList rows={5} />
          ) : (
            <>
              <section className="ritmo-hero-card ritmo-hero" aria-label="Calorías del día">
                <KcalRing totals={summary.totals} />
                <div className="ritmo-balance">
                  <div className="ritmo-balance__row">
                    <span className="ritmo-balance__label">Comido</span>
                    <span className="ritmo-balance__value">
                      {formatKcal(summary.totals.kcalIn)}
                    </span>
                  </div>
                  <div className="ritmo-balance__row">
                    <span className="ritmo-balance__label">Ejercicio</span>
                    <span className="ritmo-balance__value">
                      {formatKcal(summary.totals.kcalBurned)}
                    </span>
                  </div>
                  <div className="ritmo-balance__row">
                    <span className="ritmo-balance__label">Objetivo</span>
                    <span className="ritmo-balance__value">
                      {summary.totals.kcalTarget === null
                        ? '—'
                        : formatKcal(summary.totals.kcalTarget)}
                    </span>
                  </div>
                </div>
              </section>

              <section className="core-card" aria-label="Macros">
                <MacroBars totals={summary.totals} profile={profile} />
              </section>

              {MEAL_ORDER.map((type) => {
                const entries = summary.meals.filter((m) => m.mealType === type);
                const kcal = entries.reduce((sum, m) => sum + m.kcal, 0);
                return (
                  <section key={type} aria-label={mealLabel(type)}>
                    <div className="ritmo-section-head">
                      <h2 className="core-section-label">{mealLabel(type)}</h2>
                      {entries.length > 0 ? (
                        <span className="ritmo-section-head__value">
                          {formatKcal(kcal)} kcal
                        </span>
                      ) : null}
                    </div>

                    <div className="core-group ritmo-list">
                      {entries.map((entry) => (
                        <div key={entry.id} className="ritmo-entry">
                          <div className="ritmo-entry__body">
                            <div className="ritmo-entry__name">{entry.name}</div>
                            <div className="ritmo-entry__meta">
                              {formatGrams(entry.quantityG)} · P{' '}
                              {Math.round(entry.proteinG)} · H{' '}
                              {Math.round(entry.carbsG)} · G {Math.round(entry.fatG)}
                            </div>
                          </div>
                          <span className="ritmo-entry__kcal">{formatKcal(entry.kcal)}</span>
                          <IonButton
                            fill="clear"
                            className="ritmo-entry__delete"
                            aria-label={`Borrar ${entry.name}`}
                            onClick={() => void removeMeal(entry.id)}
                          >
                            <IonIcon slot="icon-only" icon={trashOutline} />
                          </IonButton>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="ritmo-entry ritmo-entry--action"
                        onClick={() => openRegister('meal', type)}
                      >
                        <span className="core-tint-icon" aria-hidden="true">
                          <IonIcon icon={addOutline} />
                        </span>
                        <span className="ritmo-entry__body">Añadir</span>
                      </button>
                    </div>
                  </section>
                );
              })}

              <section aria-label="Entrenos">
                <div className="ritmo-section-head">
                  <h2 className="core-section-label">Entrenos</h2>
                </div>
                {summary.sessions.length === 0 ? (
                  <div className="core-group">
                    <EmptyState
                      icon={barbellOutline}
                      title="Sin entrenos este día"
                      description="Registra un entreno para sumar las calorías que gastas."
                      actionLabel="Registrar entreno"
                      onAction={() => openRegister('activity')}
                    />
                  </div>
                ) : (
                  <div className="core-group ritmo-list">
                    {summary.sessions.map((session) => (
                      <div key={session.id} className="ritmo-entry">
                        <span className="core-tint-icon core-tint-icon--activity">
                          <IonIcon icon={barbellOutline} aria-hidden="true" />
                        </span>
                        <div className="ritmo-entry__body">
                          <div className="ritmo-entry__name">{session.activityTypeName}</div>
                          <div className="ritmo-entry__meta">
                            {formatDuration(session.durationSec)}
                            {session.distanceM ? ` · ${formatDistance(session.distanceM)}` : ''}
                          </div>
                        </div>
                        <span className="ritmo-entry__kcal ritmo-entry__kcal--burned">
                          −{formatKcal(session.kcalBurned)}
                        </span>
                        <IonButton
                          fill="clear"
                          className="ritmo-entry__delete"
                          aria-label={`Borrar ${session.activityTypeName}`}
                          onClick={() => void removeSession(session.id)}
                        >
                          <IonIcon slot="icon-only" icon={trashOutline} />
                        </IonButton>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
