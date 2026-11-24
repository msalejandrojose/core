import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Link } from 'react-router-dom';
import { useRegisterStore } from '../register.store';
import { usePlanWeekData } from '../plan/plan.api';
import { WeekPlanCard } from '../plan/WeekPlanCard';
import { Chevron, Icon, NavRow, SectionHeader } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { SkeletonList } from '@/components/ux';
import '../plan/plan.css';
import './training.css';

/** Accesos a cada análisis de Rendimiento (antes, dentro de Progreso). */
const PERFORMANCE = [
  { to: '', title: 'Resumen de rendimiento', sub: 'Índices, recomendaciones y tendencias', icon: 'M4 16l5-6 4 4 7-9' },
  { to: 'fuerza', title: 'Fuerza', sub: '1RM estimado, marcas y estancamientos', icon: PATHS.strength },
  { to: 'musculos', title: 'Músculos', sub: 'Carga por grupo muscular', icon: 'M7 4c-2 3-2 6 0 8 2 2 2 5 0 8M17 4c2 3 2 6 0 8-2 2-2 5 0 8M9 8h6M9 16h6' },
  { to: 'cardio', title: 'Cardio', sub: 'Zonas, eficiencia y predicción de marcas', icon: PATHS.run },
  { to: 'carga', title: 'Carga y descanso', sub: 'Carga reciente frente a la habitual', icon: 'M7 7h10M7 17h10M4 12h16' },
  { to: 'ejercicios', title: 'Ejercicios', sub: 'Cómo se hace cada uno y tu evolución', icon: PATHS.book },
  { to: 'entrenos', title: 'Historial', sub: 'Todos tus entrenos: ver, editar o borrar', icon: 'M5 6h14M5 12h14M5 18h9' },
] as const;

/**
 * Pestaña Entrenos (TASK-428): lo que toca esta semana, empezar o apuntar un
 * entreno, las rutinas y el rendimiento, juntos en un sitio. Antes estaban
 * repartidos entre Hoy (plan), Ajustes (rutinas) y Progreso (rendimiento).
 */
export default function TrainingPage() {
  const open = useRegisterStore((s) => s.open);
  const { data: week, reload } = usePlanWeekData();
  const s = week?.summary;

  return (
    <IonPage>
      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (e) => {
            reload();
            e.detail.complete();
          }}
        >
          <IonRefresherContent />
        </IonRefresher>
        <div className="rk-screen training">
          <NavRow />
          <header className="rk-title">
            <h1>Entrenos</h1>
            <span className="rk-title__sub">
              {s
                ? s.planned
                  ? `Esta semana: ${s.done} de ${s.planned} sesiones hechas`
                  : 'Aún no tienes sesiones esta semana'
                : 'Tu semana, tus rutinas y tu rendimiento'}
            </span>
          </header>

          <div className="rk-list food-hub">
            <button type="button" className="rk-row" onClick={() => open('activity')}>
              <span className="food-hub__icon is-tint" aria-hidden="true">
                <Icon d={PATHS.plus} size={20} stroke={2.4} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Registrar entreno</span>
                <span className="rk-row__sub">Fútbol, gimnasio, carrera… o empieza uno en directo</span>
              </span>
              <Chevron />
            </button>
            <Link to="/tabs/entrenos/rutinas" className="rk-row">
              <span className="food-hub__icon" aria-hidden="true">
                <Icon d={PATHS.strength} size={20} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Mis rutinas</span>
                <span className="rk-row__sub">Créalas, edítalas y empieza una</span>
              </span>
              <Chevron />
            </Link>
            <Link to="/tabs/entrenos/plan" className="rk-row">
              <span className="food-hub__icon" aria-hidden="true">
                <Icon d={PATHS.copy} size={20} />
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Planificar la semana</span>
                <span className="rk-row__sub">Sesiones, plantillas y objetivo</span>
              </span>
              <Chevron />
            </Link>
          </div>

          {week ? <WeekPlanCard week={week} /> : <SkeletonList rows={4} />}

          <section aria-labelledby="rendimiento" className="rk-section">
            <SectionHeader id="rendimiento">Rendimiento</SectionHeader>
            <div className="rk-list food-hub">
              {PERFORMANCE.map((p) => (
                <Link
                  key={p.to || 'resumen'}
                  to={p.to ? `/tabs/entrenos/rendimiento/${p.to}` : '/tabs/entrenos/rendimiento'}
                  className="rk-row"
                >
                  <span className="food-hub__icon" aria-hidden="true">
                    <Icon d={p.icon} size={20} />
                  </span>
                  <span className="rk-row__main">
                    <span className="rk-row__title">{p.title}</span>
                    <span className="rk-row__sub">{p.sub}</span>
                  </span>
                  <Chevron />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
