import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { call, isApiError } from '../api';
import { useBrioStore } from '../brio.store';
import { BackLink, LargeTitle, NavRow, SectionHeader, Segmented, Switch } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useGarminStatus } from './garmin.api';
import { useHevyStatus } from './hevy.api';
import './profile.css';

interface Prefs {
  importActivities: boolean;
  importHealth: boolean;
  exerciseKcalSharePct: number;
}

const IMPORTS: { id: 'importActivities' | 'importHealth'; label: string; desc: string }[] = [
  { id: 'importActivities', label: 'Actividades y entrenos', desc: 'Tipo, duración, pulso, distancia y calorías' },
  { id: 'importHealth', label: 'Sueño, pulso y pasos', desc: 'Horas de sueño, FC en reposo, variabilidad y pasos' },
];
const SHARES = ['100', '75', '50', '0'] as const;

/**
 * Conexiones (lienzo "Conexiones"): el reloj Garmin, Hevy y qué hace Brío con
 * lo que traen. Las preferencias se guardan al tocarlas. Apple Salud y enviar
 * datos al reloj aún no existen, y la pantalla lo dice en vez de simularlo.
 */
export default function ConnectionsPage() {
  const { status: hevy } = useHevyStatus();
  const { status: garmin } = useGarminStatus();
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    let alive = true;
    call<Prefs>('GET', '/brio/connections/prefs')
      .then((p) => alive && setPrefs(p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function save(change: Partial<Prefs>) {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, ...change });
    try {
      setPrefs(await call<Prefs>('PUT', '/brio/connections/prefs', { body: change }));
      // El porcentaje cambia las kcal restantes de Hoy.
      if (change.exerciseKcalSharePct !== undefined) void refreshDay();
    } catch (e) {
      setPrefs(before);
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Perfil" fallback="/tabs/settings" />} />
          <LargeTitle>Conexiones</LargeTitle>

          <section aria-label="Reloj Garmin" className="conn__device">
            <span className="conn__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="3" />
                <path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1" />
              </svg>
            </span>
            <div className="rk-row__main">
              <span className="conn__device-name">Garmin</span>
              <span className="conn__status">
                <span className={`conn__dot${garmin?.connected ? ' is-on' : ''}`} aria-hidden="true" />
                {garmin?.connected
                  ? garmin.lastError
                    ? 'Conectado · revisa la clave'
                    : `Conectado · ${garmin.importedSessions} entrenos`
                  : 'Sin conectar'}
              </span>
            </div>
            <Link to="/tabs/settings/garmin" className="rk-textbtn">
              {garmin?.connected ? 'Abrir' : 'Conectar'}
            </Link>
          </section>

          <section className="rk-section" aria-labelledby="imp">
            <SectionHeader id="imp">Qué traer del reloj</SectionHeader>
            <div className="rk-list">
              {IMPORTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={!!prefs?.[t.id]}
                  disabled={!prefs}
                  className="rk-row conn__toggle"
                  onClick={() => void save({ [t.id]: !prefs?.[t.id] })}
                >
                  <span className="rk-row__main">
                    <span className="rk-row__title">{t.label}</span>
                    <span className="rk-row__sub">{t.desc}</span>
                  </span>
                  <Switch on={!!prefs?.[t.id]} />
                </button>
              ))}
            </div>
            <p className="rk-note">Lo que apagues deja de pedirse a Garmin; lo ya traído se queda. Enviar sesiones al reloj aún no es posible.</p>
          </section>

          <section className="rk-section" aria-labelledby="gym">
            <SectionHeader id="gym">Gimnasio</SectionHeader>
            <Link to="/tabs/settings/hevy" className="rk-row conn__gym">
              <span className="conn__badge conn__badge--hevy" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={PATHS.strength} />
                </svg>
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Hevy</span>
                <span className="rk-row__sub">
                  {hevy?.connected ? `${hevy.importedSessions} entrenos importados` : 'Entrenos de fuerza con series y pesos'}
                </span>
              </span>
              <span className="conn__link">{hevy?.connected ? 'Conectado' : 'Conectar'}</span>
            </Link>
          </section>

          <section className="rk-section" aria-labelledby="salud">
            <SectionHeader id="salud">Salud del teléfono</SectionHeader>
            <div className="rk-list">
              <div className="rk-row">
                <span className="conn__badge conn__badge--health" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="var(--brio-heart)" />
                  </svg>
                </span>
                <span className="rk-row__main">
                  <span className="rk-row__title">Apple Salud y Health Connect</span>
                  <span className="rk-row__sub">Próximamente, con la app para iPhone y Android</span>
                </span>
              </div>
            </div>
          </section>

          <section className="rk-section" aria-labelledby="adj">
            <SectionHeader id="adj">Calorías de ejercicio en el objetivo</SectionHeader>
            <Segmented
              label="Porcentaje de calorías activas"
              options={SHARES.map((p) => ({ value: p, label: p === '0' ? 'No' : `${p} %` }))}
              value={String(prefs?.exerciseKcalSharePct ?? 100) as (typeof SHARES)[number]}
              onChange={(v) => void save({ exerciseKcalSharePct: Number(v) })}
            />
            <p className="rk-note">
              Qué parte de lo que gastas entrenando se suma a las calorías que puedes comer ese día. Baja el porcentaje si tu reloj tiende a contar de más.
            </p>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
