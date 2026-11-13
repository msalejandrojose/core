import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { brioApi } from '../api';
import { MEAL_ORDER, dayLabel, formatKcal, joinNames, mealLabel, ratio, todayIn } from '../format';
import { useBrioStore } from '../brio.store';
import { useRegisterStore } from '../register.store';
import { useHabitsStore } from '../habits.store';
import { BackLink, EmptyCard, Icon, NavRow, SearchField } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { ErrorState, SkeletonList } from '@/components/ux';
import { toast } from '@/lib/toast';
import './pages.css';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Comida del día (lienzo "Comida del día"): las kcal contra lo disponible
 * (objetivo + lo gastado entrenando), los macros y cada comida con lo que
 * llevó. Tocar una comida despliega sus alimentos para poder borrar uno.
 */
export default function FoodDayPage() {
  const profile = useBrioStore((s) => s.profile);
  const profileStatus = useBrioStore((s) => s.profileStatus);
  const loadProfile = useBrioStore((s) => s.loadProfile);
  const day = useBrioStore((s) => s.day);
  const summary = useBrioStore((s) => s.summary);
  const dayStatus = useBrioStore((s) => s.dayStatus);
  const loadDay = useBrioStore((s) => s.loadDay);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const stepDay = useBrioStore((s) => s.stepDay);
  const openRegister = useRegisterStore((s) => s.open);
  const invalidateHabits = useHabitsStore((s) => s.invalidate);
  const [open, setOpen] = useState<string | null>(null);

  // Se puede entrar directamente (enlace, recarga): el perfil trae los
  // objetivos de macros y la zona horaria, así que se carga si falta.
  useEffect(() => {
    if (profileStatus === 'idle') void loadProfile();
  }, [profileStatus, loadProfile]);

  useEffect(() => {
    if (dayStatus === 'idle') void loadDay();
  }, [dayStatus, loadDay]);

  const today = todayIn(profile?.timezone ?? 'Europe/Madrid');
  const [, m, d] = day.split('-');
  const dateLabel = `${dayLabel(day, today)}${day === today || dayLabel(day, today) === 'Ayer' ? `, ${Number(d)} ${MONTHS[Number(m) - 1]}` : ''}`;

  async function removeEntry(id: string) {
    try {
      await brioApi.deleteMeal(id);
      await refreshDay();
      invalidateHabits();
    } catch {
      toast.error('No se pudo borrar');
    }
  }

  const t = summary?.totals;
  const available = t && t.kcalTarget !== null ? t.kcalTarget + t.kcalBurned : null;
  const macros = summary && profile
    ? [
        { name: 'Proteína', value: t!.proteinG, target: profile.proteinTargetG },
        { name: 'Carbohidratos', value: t!.carbsG, target: profile.carbsTargetG },
        { name: 'Grasas', value: t!.fatG, target: profile.fatTargetG },
      ]
    : [];

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow
            back={<BackLink label="Hoy" fallback="/tabs/today" />}
            actions={
              <Link to="/tabs/plan" className="rk-textbtn">
                Menú del día
              </Link>
            }
          />

          <div className="foodday__title">
            <h1>Comida</h1>
            <div className="foodday__daynav">
              <button type="button" className="rk-iconbtn" aria-label="Día anterior" onClick={() => void stepDay(-1)}>
                <Icon d={PATHS.back} size={18} stroke={2.4} />
              </button>
              <span>{dateLabel}</span>
              <button
                type="button"
                className="rk-iconbtn"
                aria-label="Día siguiente"
                disabled={day >= today}
                onClick={() => void stepDay(1)}
              >
                <Icon d={PATHS.forward} size={18} stroke={2.4} />
              </button>
            </div>
          </div>

          {dayStatus === 'error' ? (
            <ErrorState message="No se pudo cargar el día." onRetry={() => void loadDay()} />
          ) : !summary || !t ? (
            <SkeletonList rows={4} />
          ) : (
            <>
              <section aria-label="Calorías y macros" className="rk-card foodday__card">
                <div className="foodday__kcal">
                  <div className="foodday__kcal-main">
                    <span className="brio-metric">{formatKcal(t.kcalIn)}</span>
                    {available !== null ? <span className="foodday__of">de {formatKcal(available)} kcal</span> : null}
                  </div>
                  {t.kcalRemaining !== null ? (
                    <span className="foodday__left">
                      {t.kcalRemaining >= 0 ? `Quedan ${formatKcal(t.kcalRemaining)}` : `${formatKcal(-t.kcalRemaining)} de más`}
                    </span>
                  ) : null}
                </div>
                <div className="foodday__bar" aria-hidden="true">
                  <div style={{ width: `${ratio(t.kcalIn, available) * 100}%` }} />
                </div>
                {t.kcalBurned > 0 ? (
                  <span className="rk-row__sub">Incluye {formatKcal(t.kcalBurned)} kcal de entreno registrado</span>
                ) : null}
                <div className="foodday__macros">
                  {macros.map((mc) => (
                    <div key={mc.name} className="foodday__macro">
                      <span className="foodday__macro-name">{mc.name}</span>
                      <div className="foodday__macro-bar" aria-hidden="true">
                        <div style={{ width: `${ratio(mc.value, mc.target) * 100}%` }} />
                      </div>
                      <span className="foodday__macro-value">
                        {Math.round(mc.value)}
                        {mc.target ? <span> / {mc.target} g</span> : <span> g</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="rk-search-row">
                <SearchField
                  label="Buscar alimento"
                  placeholder="Buscar alimento"
                  onFocus={() => openRegister('meal')}
                />
              </div>

              <div className="foodday__tools">
                <button type="button" className="rk-tilebtn" onClick={() => openRegister('copy')}>
                  <Icon d={PATHS.copy} size={18} />
                  Copiar de otro día
                </button>
                <Link to="/tabs/today/recetas" className="rk-tilebtn">
                  <Icon d={PATHS.book} size={18} />
                  Mis recetas
                </Link>
              </div>

              {summary.meals.length === 0 ? (
                <EmptyCard
                  tone="food"
                  icon={PATHS.fork}
                  title={day === today ? 'Aún no has apuntado nada hoy' : 'Este día no tiene comidas'}
                  text={
                    day === today
                      ? 'Empieza por el desayuno: con lo de siempre tardas unos segundos.'
                      : 'Puedes apuntarlas ahora o copiar las de otro día.'
                  }
                  primary={{ label: 'Añadir desayuno', onClick: () => openRegister('meal', 'BREAKFAST') }}
                  secondary={{ label: 'Copiar de ayer', onClick: () => openRegister('copy') }}
                />
              ) : null}

              <ul aria-label="Comidas del día" className="rk-list foodday__meals">
                {MEAL_ORDER.map((type) => {
                  const entries = summary.meals.filter((e) => e.mealType === type);
                  const kcal = entries.reduce((s, e) => s + e.kcal, 0);
                  const expanded = open === type;
                  return (
                    <li key={type}>
                      <div className="foodday__meal">
                        <button
                          type="button"
                          className="foodday__meal-main"
                          aria-expanded={entries.length ? expanded : undefined}
                          onClick={() => (entries.length ? setOpen(expanded ? null : type) : openRegister('meal', type))}
                        >
                          <span className="foodday__meal-name">{mealLabel(type)}</span>
                          <span className="rk-row__sub">
                            {entries.length ? joinNames(entries.map((e) => e.name)) : 'Sin registrar'}
                          </span>
                        </button>
                        {entries.length ? (
                          <>
                            <span className="rk-row__value">{formatKcal(kcal)} kcal</span>
                            <button
                              type="button"
                              className="rk-iconbtn"
                              aria-label={`Añadir a ${mealLabel(type).toLowerCase()}`}
                              onClick={() => openRegister('meal', type)}
                            >
                              <Icon d={PATHS.plusCircle} size={24} stroke={1.8} />
                            </button>
                          </>
                        ) : (
                          <button type="button" className="rk-textbtn foodday__add" onClick={() => openRegister('meal', type)}>
                            Añadir
                          </button>
                        )}
                      </div>
                      {expanded
                        ? entries.map((e) => (
                            <div key={e.id} className="foodday__entry">
                              <span className="rk-row__main">
                                <span className="foodday__entry-name">{e.name}</span>
                                <span className="rk-row__sub">
                                  {Math.round(e.quantityG)} g · {formatKcal(e.kcal)} kcal
                                </span>
                              </span>
                              <button
                                type="button"
                                className="rk-textbtn foodday__delete"
                                onClick={() => void removeEntry(e.id)}
                              >
                                Borrar
                              </button>
                            </div>
                          ))
                        : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
