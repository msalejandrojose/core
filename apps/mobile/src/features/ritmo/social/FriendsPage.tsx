import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { EmptyCard, ExampleTag, LargeTitle, NavRow, SearchField, SectionHeader, Segmented } from '../ui/kit';
import { Avatar, Heart } from './Avatar';
import { FEED, PEOPLE, invite, personById, useSocialStore, type Person } from './social-data';
import './social.css';

const TROPHY = 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8';
const ADD_PERSON = 'M9 4.5a3.5 3.5 0 1 0 .01 0M2.5 20a6.5 6 0 0 1 13 0M19 8v6M16 11h6';

async function onInvite() {
  const r = await invite();
  if (r === 'copied') toast.success('Enlace copiado', 'Pégalo en un mensaje para invitar.');
}

function PersonRow({ p, meta }: { p: Person; meta: string }) {
  const on = useSocialStore((s) => !!s.follow[p.id]);
  const toggle = useSocialStore((s) => s.toggleFollow);
  return (
    <div className="social__person">
      <Link to={`/tabs/social/amigo/${p.id}`} className="social__person-link">
        <Avatar name={p.name} color={p.color} size={44} />
        <span className="rk-row__main">
          <span className="rk-row__title">{p.name}</span>
          <span className="rk-row__sub">{meta}</span>
        </span>
      </Link>
      <button
        type="button"
        aria-pressed={on}
        className={`social__follow${on ? ' is-on' : ''}`}
        onClick={() => toggle(p.id)}
      >
        {on ? 'Siguiendo' : 'Seguir'}
      </button>
    </div>
  );
}

/** Social › Amigos (lienzo "Amigos"): actividad de quien sigues y a quién sigues. */
export default function FriendsPage() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'feed' | 'following'>('feed');
  const follow = useSocialStore((s) => s.follow);
  const cheered = useSocialStore((s) => s.cheered);
  const toggleCheer = useSocialStore((s) => s.toggleCheer);

  const query = q.trim().toLowerCase();
  const results = PEOPLE.filter((p) => p.name.toLowerCase().includes(query) || p.user.includes(query));
  const following = PEOPLE.filter((p) => follow[p.id]);
  const suggestions = PEOPLE.filter((p) => !follow[p.id]);
  const feed = FEED.filter((f) => follow[f.who]);
  const noFriends = (
    <EmptyCard
      tone="social"
      icon={ADD_PERSON}
      title="Entrenar acompañado engancha más"
      text="Sigue a tus amigos para ver sus logros, animaros y hacer retos juntos."
      primary={{ label: 'Buscar amigos', onClick: () => (tab === 'feed' ? setTab('following') : document.querySelector<HTMLInputElement>('.social input[type=search]')?.focus()) }}
      secondary={{ label: 'Invitar con enlace', onClick: () => void onInvite() }}
    />
  );

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen social">
          <NavRow
            actions={
              <>
                <Link to="/tabs/social/retos" className="rk-textbtn rk-textbtn--strong social__navbtn">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={TROPHY} />
                  </svg>
                  Retos
                </Link>
                <button type="button" className="rk-textbtn social__navbtn" onClick={() => void onInvite()}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ADD_PERSON} />
                  </svg>
                  Invitar
                </button>
              </>
            }
          />
          <LargeTitle sub={<ExampleTag />}>Amigos</LargeTitle>

          <SearchField label="Buscar personas" placeholder="Buscar por nombre o @usuario" value={q} onChange={setQ} />

          {query ? (
            <section className="rk-section" aria-label="Resultados">
              <SectionHeader>{results.length ? `${results.length} resultados` : 'Sin resultados'}</SectionHeader>
              {results.length ? (
                <div className="social__list">
                  {results.map((p) => (
                    <PersonRow key={p.id} p={p} meta={p.user} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : (
            <>
              <Link to="/tabs/settings" className="social__privacy">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ritmo-ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <span>Compartes entrenos y objetivos cumplidos. Tu peso y tus comidas, no.</span>
                <span className="social__privacy-link">Cambiar</span>
              </Link>

              <Segmented
                label="Vista"
                options={[
                  { value: 'feed', label: 'Actividad' },
                  { value: 'following', label: 'Siguiendo' },
                ]}
                value={tab}
                onChange={setTab}
              />

              {tab === 'feed' && !feed.length ? noFriends : null}
              {tab === 'feed' && feed.length ? (
                <div className="social__feed">
                  {feed.map((f) => {
                    const p = personById(f.who)!;
                    const on = !!cheered[f.id];
                    const first = p.name.split(' ')[0];
                    return (
                      <article key={f.id} className="social__post">
                        <div className="social__post-head">
                          <Link to={`/tabs/social/amigo/${p.id}`} aria-label={first}>
                            <Avatar name={p.name} color={p.color} size={40} />
                          </Link>
                          <div className="rk-row__main">
                            <span className="social__post-name">{first}</span>
                            <span className="social__post-when">{f.when}</span>
                          </div>
                          <span className={`social__badge social__badge--${f.kind}`}>{f.badge}</span>
                        </div>
                        <p>{f.text}</p>
                        <button
                          type="button"
                          aria-pressed={on}
                          className={`social__cheer${on ? ' is-on' : ''}`}
                          onClick={() => toggleCheer(f.id)}
                        >
                          <Heart on={on} />
                          Ánimo · {f.cheers + (on ? 1 : 0)}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : null}
              {tab === 'following' ? (
                <>
                  {following.length ? (
                    <section className="rk-section" aria-label="Siguiendo">
                      <SectionHeader>Siguiendo · {following.length}</SectionHeader>
                      <div className="social__list">
                        {following.map((p) => (
                          <PersonRow key={p.id} p={p} meta={p.meta} />
                        ))}
                      </div>
                    </section>
                  ) : (
                    noFriends
                  )}
                  {suggestions.length ? (
                    <section className="rk-section" aria-label="Sugerencias">
                      <SectionHeader>Quizá conozcas</SectionHeader>
                      <div className="social__list">
                        {suggestions.map((p) => (
                          <PersonRow key={p.id} p={p} meta={p.meta} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
