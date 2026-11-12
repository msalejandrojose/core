import { useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { BackLink, ExampleTag, NavRow, SectionHeader } from '../ui/kit';
import { Avatar, Heart } from './Avatar';
import { personById, useSocialStore } from './social-data';
import './social.css';

const STATS = [
  { label: 'Sesiones', value: '4', sub: 'esta semana' },
  { label: 'Racha', value: '12 días', sub: 'activa' },
  { label: 'Objetivos', value: '3', sub: 'cumplidos en nov.' },
];

const GOALS = [
  { name: 'Media maratón', right: '22 de marzo', done: false, pct: 40, color: 'var(--ritmo-food)', note: 'Fase base · 40 % del plan' },
  { name: '10.000 pasos al día', right: 'Cumplido', done: true, pct: 100, color: 'var(--ritmo-activity)', note: '5 de 7 días esta semana' },
];

const CHECK = 'M5 12.5l4.5 4.5L19 7';
const TREND = 'M4 16l6-6 4 4 6-6M14 8h6v6';
const LOGROS = [
  { icon: CHECK, kind: 'goal', title: 'Objetivo de pasos cumplido', when: 'Hoy' },
  { icon: TREND, kind: 'pr', title: 'Tirada larga de 14 km', when: 'Domingo · su más larga' },
  { icon: CHECK, kind: 'goal', title: 'Semana perfecta: 6 de 6', when: 'Lunes' },
];

/** Social › Amigo (lienzo "Amigo"): lo que comparte una persona que sigues. */
export default function FriendPage() {
  const { id } = useParams<{ id: string }>();
  const p = personById(id) ?? personById('laura')!;
  const following = useSocialStore((s) => !!s.follow[p.id]);
  const toggleFollow = useSocialStore((s) => s.toggleFollow);
  const cheered = useSocialStore((s) => !!s.cheered[`friend-${p.id}`]);
  const toggleCheer = useSocialStore((s) => s.toggleCheer);
  const first = p.name.split(' ')[0];

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen social">
          <NavRow back={<BackLink label="Amigos" fallback="/tabs/social" />} actions={<ExampleTag />} />

          <header className="friend__head">
            <Avatar name={p.name} color={p.color} size={84} />
            <h1>{p.name}</h1>
            <span className="friend__user">
              {p.user}
              {following ? ' · os seguís mutuamente' : ''}
            </span>
            <button
              type="button"
              aria-pressed={following}
              className={`social__follow friend__follow${following ? ' is-on' : ''}`}
              onClick={() => toggleFollow(p.id)}
            >
              {following ? 'Siguiendo' : 'Seguir'}
            </button>
          </header>

          <section aria-label="Esta semana" className="friend__stats">
            {STATS.map((s) => (
              <div key={s.label} className="friend__stat">
                <span className="friend__stat-label">{s.label}</span>
                <span className="friend__stat-value">{s.value}</span>
                <span className="friend__stat-sub">{s.sub}</span>
              </div>
            ))}
          </section>

          <section className="rk-section" aria-labelledby="obj">
            <SectionHeader id="obj">Sus objetivos</SectionHeader>
            <div className="rk-list">
              {GOALS.map((g) => (
                <div key={g.name} className="social__goal">
                  <div className="social__goal-head">
                    <span className="rk-row__title">{g.name}</span>
                    <span className={g.done ? 'social__goal-done' : 'rk-row__sub'}>{g.right}</span>
                  </div>
                  <div className="social__bar" aria-hidden="true">
                    <div style={{ width: `${g.pct}%`, background: g.color }} />
                  </div>
                  <span className="rk-row__sub">{g.note}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rk-section" aria-labelledby="logros">
            <SectionHeader id="logros">Últimos logros</SectionHeader>
            <ul className="rk-list">
              {LOGROS.map((l) => (
                <li key={l.title} className="rk-row friend__logro">
                  <span className={`friend__logro-icon social__badge--${l.kind}`} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d={l.icon} />
                    </svg>
                  </span>
                  <span className="rk-row__main">
                    <span className="friend__logro-title">{l.title}</span>
                    <span className="rk-row__sub">{l.when}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            aria-pressed={cheered}
            className={`friend__cheer${cheered ? ' is-on' : ''}`}
            onClick={() => toggleCheer(`friend-${p.id}`)}
          >
            <Heart on={cheered} size={20} />
            {cheered ? 'Le has dado ánimo' : `Dar ánimo a ${first}`}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
