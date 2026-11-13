import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { BackLink, NavRow, SectionHeader } from '../ui/kit';
import { Avatar, Heart } from './Avatar';
import { colorOf, firstName, socialApi, socialErrorText, timeAgo, type PersonProfile } from './social.api';
import './social.css';

const CHECK = 'M5 12.5l4.5 4.5L19 7';
const TREND = 'M4 16l6-6 4 4 6-6M14 8h6v6';

const RELATION_TEXT: Record<PersonProfile['relation'], string> = {
  SELF: 'Eres tú',
  FRIENDS: 'os seguís mutuamente',
  FOLLOWING: 'aún no te sigue',
  FOLLOWS_ME: 'te sigue',
  NONE: '',
};

/** Social › Amigo (lienzo "Amigo"): lo que comparte contigo una persona. */
export default function FriendPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PersonProfile | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    socialApi
      .person(id)
      .then(setP)
      .catch(() => setError(true));
  }, [id]);
  useEffect(load, [load]);

  if (!p) {
    return (
      <IonPage>
        <IonContent>
          <div className="rk-screen social">
            <NavRow back={<BackLink label="Amigos" fallback="/tabs/social" />} />
            {error ? <p className="rk-note">No se pudo cargar esta persona.</p> : null}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const following = p.relation === 'FRIENDS' || p.relation === 'FOLLOWING';
  const latest = p.events[0];

  async function toggleFollow() {
    setBusy(true);
    try {
      await (following ? socialApi.unfollow(p!.id) : socialApi.follow(p!.id));
      load();
    } catch (e) {
      toast.error('No se pudo guardar', socialErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function cheer() {
    if (!latest) return;
    try {
      await socialApi.cheer(latest.key, !latest.cheered);
      load();
    } catch (e) {
      toast.error('No se pudo enviar', socialErrorText(e));
    }
  }

  const stats = [
    { label: 'Sesiones', value: String(p.sessionsThisWeek ?? 0), sub: 'esta semana' },
    { label: 'Racha', value: `${p.streakDays ?? 0} ${p.streakDays === 1 ? 'día' : 'días'}`, sub: p.streakDays ? 'activa' : 'sin racha' },
    { label: 'Kilómetros', value: String(p.kmThisWeek ?? 0).replace('.', ','), sub: 'esta semana' },
  ];

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen social">
          <NavRow back={<BackLink label="Amigos" fallback="/tabs/social" />} />

          <header className="friend__head">
            <Avatar name={p.name} color={colorOf(p.id)} size={84} />
            <h1>{p.name}</h1>
            <span className="friend__user">
              @{p.handle}
              {RELATION_TEXT[p.relation] ? ` · ${RELATION_TEXT[p.relation]}` : ''}
            </span>
            {p.relation !== 'SELF' ? (
              <button type="button" aria-pressed={following} disabled={busy} className={`social__follow friend__follow${following ? ' is-on' : ''}`} onClick={() => void toggleFollow()}>
                {following ? 'Siguiendo' : p.relation === 'FOLLOWS_ME' ? 'Seguir también' : 'Seguir'}
              </button>
            ) : null}
          </header>

          {!p.visible ? (
            <p className="rk-note">
              {p.relation === 'FRIENDS'
                ? `${firstName(p.name)} no comparte su actividad ahora mismo.`
                : p.relation === 'FOLLOWING'
                  ? `Verás los entrenos de ${firstName(p.name)} cuando también te siga.`
                  : `Sigue a ${firstName(p.name)}: cuando os sigáis los dos, veréis vuestros entrenos.`}
            </p>
          ) : (
            <>
              <section aria-label="Esta semana" className="friend__stats">
                {stats.map((s) => (
                  <div key={s.label} className="friend__stat">
                    <span className="friend__stat-label">{s.label}</span>
                    <span className="friend__stat-value">{s.value}</span>
                    <span className="friend__stat-sub">{s.sub}</span>
                  </div>
                ))}
              </section>

              {p.goal ? (
                <section className="rk-section" aria-labelledby="obj">
                  <SectionHeader id="obj">Su objetivo</SectionHeader>
                  <div className="rk-list">
                    <div className="social__goal">
                      <div className="social__goal-head">
                        <span className="rk-row__title">{p.goal.name}</span>
                        <span className="rk-row__sub">
                          {p.goal.daysToRace === null ? 'Sin fecha' : p.goal.daysToRace > 0 ? `Faltan ${p.goal.daysToRace} días` : p.goal.daysToRace === 0 ? 'Es hoy' : 'Ya pasó'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <section className="rk-section" aria-labelledby="logros">
                <SectionHeader id="logros">Últimos entrenos</SectionHeader>
                {p.events.length ? (
                  <ul className="rk-list">
                    {p.events.map((e) => (
                      <li key={e.key} className="rk-row friend__logro">
                        <span className={`friend__logro-icon social__badge--${e.kind}`} aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d={e.kind === 'pr' ? TREND : CHECK} />
                          </svg>
                        </span>
                        <span className="rk-row__main">
                          <span className="friend__logro-title">{e.text}</span>
                          <span className="rk-row__sub">{timeAgo(e.at)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rk-note">Sin entrenos en las dos últimas semanas.</p>
                )}
              </section>

              {latest && p.relation !== 'SELF' ? (
                <button type="button" aria-pressed={latest.cheered} className={`friend__cheer${latest.cheered ? ' is-on' : ''}`} onClick={() => void cheer()}>
                  <Heart on={latest.cheered} size={20} />
                  {latest.cheered ? 'Le has dado ánimo' : `Dar ánimo a ${firstName(p.name)}`}
                </button>
              ) : null}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
