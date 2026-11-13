import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { EmptyCard, LargeTitle, NavRow, SearchField, SectionHeader, Segmented } from '../ui/kit';
import { Avatar, Heart } from './Avatar';
import { colorOf, firstName, invite, personMeta, socialApi, socialErrorText, timeAgo, type FeedItem, type Me, type People, type Person } from './social.api';
import './social.css';

const ADD_PERSON = 'M9 4.5a3.5 3.5 0 1 0 .01 0M2.5 20a6.5 6 0 0 1 13 0M19 8v6M16 11h6';

function PersonRow({ p, onChange }: { p: Person; onChange: (next: Person) => void }) {
  const on = p.relation === 'FRIENDS' || p.relation === 'FOLLOWING';
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      onChange(await (on ? socialApi.unfollow(p.id) : socialApi.follow(p.id)));
    } catch (e) {
      toast.error('No se pudo guardar', socialErrorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="social__person">
      <Link to={`/tabs/social/amigo/${p.id}`} className="social__person-link">
        <Avatar name={p.name} color={colorOf(p.id)} size={44} />
        <span className="rk-row__main">
          <span className="rk-row__title">{p.name}</span>
          <span className="rk-row__sub">{personMeta(p)}</span>
        </span>
      </Link>
      <button type="button" aria-pressed={on} disabled={busy} className={`social__follow${on ? ' is-on' : ''}`} onClick={() => void toggle()}>
        {on ? 'Siguiendo' : p.relation === 'FOLLOWS_ME' ? 'Seguir también' : 'Seguir'}
      </button>
    </div>
  );
}

/** Social › Amigos (lienzo "Amigos"): la actividad de tus amigos y a quién sigues. */
export default function FriendsPage() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'feed' | 'following'>('feed');
  const [me, setMe] = useState<Me | null>(null);
  const [people, setPeople] = useState<People | null>(null);
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const [results, setResults] = useState<Person[] | null>(null);

  const load = useCallback(() => {
    void Promise.all([socialApi.me(), socialApi.people(), socialApi.feed()])
      .then(([m, p, f]) => {
        setMe(m);
        setPeople(p);
        setFeed(f);
      })
      .catch(() => toast.error('No se pudo cargar Social'));
  }, []);
  useEffect(load, [load]);

  const query = q.trim();
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    let alive = true;
    // Espera a que dejes de escribir antes de buscar.
    const timer = setTimeout(() => {
      socialApi
        .search(query)
        .then((r) => alive && setResults(r.results))
        .catch(() => alive && setResults([]));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  async function onInvite() {
    const r = await invite(me?.handle);
    if (r === 'copied') toast.success('Invitación copiada', 'Pégala en un mensaje.');
  }

  async function toggleShare() {
    if (!me) return;
    try {
      setMe(await socialApi.updateMe({ shareActivity: !me.shareActivity }));
    } catch (e) {
      toast.error('No se pudo guardar', socialErrorText(e));
    }
  }

  async function cheer(item: FeedItem) {
    const on = !item.cheered;
    setFeed((f) => f?.map((x) => (x.key === item.key ? { ...x, cheered: on, cheers: x.cheers + (on ? 1 : -1) } : x)) ?? f);
    try {
      await socialApi.cheer(item.key, on);
    } catch {
      load();
    }
  }

  const following = people ? [...people.friends, ...people.pending] : [];
  const noFriends = (
    <EmptyCard
      tone="social"
      icon={ADD_PERSON}
      title="Entrenar acompañado engancha más"
      text="Sigue a tus amigos y pídeles que te sigan: cuando os seguís los dos, veis vuestros logros y podéis retaros."
      primary={{ label: 'Buscar amigos', onClick: () => document.querySelector<HTMLInputElement>('.social input[type=search]')?.focus() }}
      secondary={{ label: 'Invitar', onClick: () => void onInvite() }}
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
                  Retos
                </Link>
                <button type="button" className="rk-textbtn social__navbtn" onClick={() => void onInvite()}>
                  Invitar
                </button>
              </>
            }
          />
          <LargeTitle sub={me ? `Tú eres @${me.handle}` : undefined}>Amigos</LargeTitle>

          <SearchField label="Buscar personas" placeholder="Buscar por nombre o @usuario" value={q} onChange={setQ} />

          {query.length >= 2 ? (
            <section className="rk-section" aria-label="Resultados">
              <SectionHeader>{results === null ? 'Buscando…' : results.length ? `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}` : 'Sin resultados'}</SectionHeader>
              {results?.length ? (
                <div className="social__list">
                  {results.map((p) => (
                    <PersonRow
                      key={p.id}
                      p={p}
                      onChange={(next) => {
                        setResults((r) => r?.map((x) => (x.id === next.id ? next : x)) ?? r);
                        load();
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : (
            <>
              {me ? (
                <button type="button" className="social__privacy" aria-pressed={me.shareActivity} onClick={() => void toggleShare()}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                  <span>
                    {me.shareActivity
                      ? 'Tus amigos ven tus entrenos y tu objetivo. Tu peso y tus comidas, nunca.'
                      : 'Ahora no compartes nada con tus amigos.'}
                  </span>
                  <span className="social__privacy-link">{me.shareActivity ? 'No compartir' : 'Compartir'}</span>
                </button>
              ) : null}

              <Segmented
                label="Vista"
                options={[
                  { value: 'feed', label: 'Actividad' },
                  { value: 'following', label: 'Personas' },
                ]}
                value={tab}
                onChange={setTab}
              />

              {tab === 'feed' && feed && !feed.length ? (
                people?.friends.length ? (
                  <p className="rk-note">Tus amigos no han registrado entrenos esta semana.</p>
                ) : (
                  noFriends
                )
              ) : null}
              {tab === 'feed' && feed?.length ? (
                <div className="social__feed">
                  {feed.map((f) => (
                    <article key={f.key} className="social__post">
                      <div className="social__post-head">
                        <Link to={`/tabs/social/amigo/${f.userId}`} aria-label={f.name}>
                          <Avatar name={f.name} color={colorOf(f.userId)} size={40} />
                        </Link>
                        <div className="rk-row__main">
                          <span className="social__post-name">{firstName(f.name)}</span>
                          <span className="social__post-when">{timeAgo(f.at)}</span>
                        </div>
                        <span className={`social__badge social__badge--${f.kind}`}>{f.badge}</span>
                      </div>
                      <p>{f.text}</p>
                      <button type="button" aria-pressed={f.cheered} className={`social__cheer${f.cheered ? ' is-on' : ''}`} onClick={() => void cheer(f)}>
                        <Heart on={f.cheered} />
                        Ánimo · {f.cheers}
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}

              {tab === 'following' && people ? (
                <>
                  {people.followers.length ? (
                    <section className="rk-section" aria-label="Te siguen">
                      <SectionHeader>Te siguen · {people.followers.length}</SectionHeader>
                      <div className="social__list">
                        {people.followers.map((p) => (
                          <PersonRow key={p.id} p={p} onChange={load} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                  {following.length ? (
                    <section className="rk-section" aria-label="Siguiendo">
                      <SectionHeader>Siguiendo · {following.length}</SectionHeader>
                      <div className="social__list">
                        {following.map((p) => (
                          <PersonRow key={p.id} p={p} onChange={load} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                  {!following.length && !people.followers.length ? noFriends : null}
                </>
              ) : null}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
