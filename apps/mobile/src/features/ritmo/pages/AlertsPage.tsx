import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { BackLink, Chevron, ExampleTag, LargeTitle, NavRow, SectionHeader, Switch } from '../ui/kit';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { KINDS, useAlertPrefs } from './alert-prefs';
import './pages.css';

const PREVIEWS = [
  {
    title: 'Te quedan 900 kcal para cenar',
    time: '20:30',
    body: 'Mañana tienes series: mejor con hidratos. ¿Repites el salmón con arroz de ayer?',
  },
  {
    title: 'Tu VFC sigue baja',
    time: '7:45',
    body: 'Te proponemos cambiar las series por un rodaje suave. Toca para revisarlo.',
  },
];

/** Avisos (lienzo "Avisos"): cómo llegan, cuáles quieres y cuándo no molestar. */
export default function AlertsPage() {
  const on = useAlertPrefs((s) => s.on);
  const toggle = useAlertPrefs((s) => s.toggle);
  const unread = useUnreadStore((s) => s.unread);

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Hoy" fallback="/tabs/today" />} />
          <LargeTitle>Avisos</LargeTitle>

          <section className="rk-section alerts__previews" aria-labelledby="prev">
            <SectionHeader id="prev">Así te llegarán</SectionHeader>
            {PREVIEWS.map((p) => (
              <div key={p.title} className="alerts__preview">
                <span className="alerts__app" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="3" strokeLinecap="round">
                    <path d="M12 4a8 8 0 1 1-7.4 5" />
                  </svg>
                </span>
                <div className="alerts__preview-main">
                  <div className="alerts__preview-head">
                    <span>{p.title}</span>
                    <span className="rk-row__sub">{p.time}</span>
                  </div>
                  <span className="alerts__preview-body">{p.body}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="rk-section" aria-labelledby="tipos">
            <SectionHeader id="tipos" action={<ExampleTag />}>
              Qué quieres que te avise
            </SectionHeader>
            <div className="rk-list">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={on[k.id]}
                  className="rk-row alerts__kind"
                  onClick={() => toggle(k.id)}
                >
                  <span className="rk-row__main">
                    <span className="rk-row__title">{k.label}</span>
                    <span className="rk-row__sub">{k.desc}</span>
                  </span>
                  <Switch on={on[k.id]} />
                </button>
              ))}
            </div>
          </section>

          <div className="rk-row alerts__dnd">
            <span className="rk-row__main rk-row__title">No molestar</span>
            <span className="rk-row__value">23:00 – 7:30</span>
          </div>

          <Link to="/tabs/notifications" className="rk-row alerts__inbox">
            <span className="rk-row__main rk-row__title">Avisos recibidos</span>
            {unread > 0 ? <span className="rk-row__value">{unread} sin leer</span> : null}
            <Chevron />
          </Link>
        </div>
      </IonContent>
    </IonPage>
  );
}
