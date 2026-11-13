import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { formatNumber } from '../format';
import { BackLink, LargeTitle, NavRow, SectionHeader, Segmented } from '../ui/kit';
import { Avatar } from './Avatar';
import { KIND_TEXT, colorOf, firstName, socialApi, socialErrorText, type Challenge, type ChallengeKind, type Person } from './social.api';
import './social.css';

const KINDS: ChallengeKind[] = ['SESSIONS', 'KM', 'STEPS', 'LOGGING'];
const DURS = [
  { value: '1', label: '1 semana' },
  { value: '2', label: '2 semanas' },
  { value: '4', label: '1 mes' },
] as const;
type Dur = (typeof DURS)[number]['value'];

const valueText = (c: Challenge, value: number) => `${formatNumber(value, c.kind === 'KM' ? 1 : 0)}${KIND_TEXT[c.kind].unit}`;

function ChallengeCard({ c, onChange }: { c: Challenge; onChange: () => void }) {
  const max = Math.max(1, ...c.ranking.map((r) => r.value));
  const me = c.ranking.find((r) => r.me);
  const leader = c.ranking[0];
  const hint = c.finished
    ? leader.value > 0
      ? `Ha ganado ${leader.me ? 'tú' : firstName(leader.name)}.`
      : 'Terminó sin actividad.'
    : me && leader && !leader.me && leader.value > me.value
      ? `Te faltan ${valueText(c, Math.round((leader.value - me.value) * 10) / 10)} para alcanzar a ${firstName(leader.name)}.`
      : me && me.position === 1 && me.value > 0
        ? 'Vas en cabeza.'
        : 'Aún no hay nada apuntado: el primero que se mueva se pone en cabeza.';

  async function cheer() {
    try {
      await socialApi.cheer(`c:${c.id}`, !c.cheered);
      onChange();
    } catch (e) {
      toast.error('No se pudo enviar', socialErrorText(e));
    }
  }
  async function leave() {
    try {
      await socialApi.leaveChallenge(c.id);
      toast.success(c.mine ? 'Reto borrado' : 'Has salido del reto');
      onChange();
    } catch (e) {
      toast.error('No se pudo salir', socialErrorText(e));
    }
  }

  return (
    <section aria-label={KIND_TEXT[c.kind].title} className="reto__card">
      <div className="reto__head">
        <div className="rk-row__main">
          <span className="reto__kicker">{c.finished ? 'Terminado' : `Competición · ${c.daysLeft === 1 ? 'último día' : `quedan ${c.daysLeft} días`}`}</span>
          <span className="reto__title">{KIND_TEXT[c.kind].title}</span>
        </div>
      </div>
      <ol className="reto__ranking">
        {c.ranking.map((r) => (
          <li key={r.userId}>
            <span className="reto__pos">{r.position}</span>
            <Avatar name={r.me ? 'T' : r.name} color={r.me ? '#8E8E93' : colorOf(r.userId)} size={32} />
            <div className="rk-row__main reto__line">
              <div className="reto__line-head">
                <span className={r.me ? 'reto__me' : undefined}>{r.me ? 'Tú' : firstName(r.name)}</span>
                <span className="reto__n">{valueText(c, r.value)}</span>
              </div>
              <div className="social__bar" aria-hidden="true">
                <div style={{ width: `${Math.round((r.value / max) * 100)}%`, background: r.me ? 'var(--ritmo-tint)' : 'var(--ritmo-border-strong)' }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
      <span className="rk-row__sub reto__hint">{hint}</span>
      <button type="button" aria-pressed={c.cheered} className={`reto__cheer${c.cheered ? ' is-on' : ''}`} onClick={() => void cheer()}>
        {c.cheered ? `Has animado al grupo · ${c.cheers}` : `Animar al grupo${c.cheers ? ` · ${c.cheers}` : ''}`}
      </button>
      <button type="button" className="rk-textbtn reto__leave" onClick={() => void leave()}>
        {c.mine ? 'Borrar reto' : 'Salir del reto'}
      </button>
    </section>
  );
}

/** Social › Retos (lienzo "Retos"): tus retos con amigos y crear uno nuevo. */
export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [friends, setFriends] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [kind, setKind] = useState<ChallengeKind>('SESSIONS');
  const [dur, setDur] = useState<Dur>('1');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    void Promise.all([socialApi.challenges(), socialApi.people()])
      .then(([c, p]) => {
        setChallenges(c);
        setFriends(p.friends);
      })
      .catch(() => toast.error('No se pudieron cargar los retos'));
  }, []);
  useEffect(load, [load]);

  const chosen = friends.filter((f) => picked[f.id]);
  const durLabel = DURS.find((d) => d.value === dur)!.label;

  async function create() {
    setSaving(true);
    try {
      await socialApi.createChallenge({ kind, weeks: Number(dur), friendIds: chosen.map((f) => f.id) });
      toast.success('Reto creado', 'Empieza hoy.');
      setPicked({});
      load();
    } catch (e) {
      toast.error('No se pudo crear', socialErrorText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen social">
          <NavRow back={<BackLink label="Amigos" fallback="/tabs/social" />} />
          <LargeTitle>Retos</LargeTitle>

          {challenges?.map((c) => <ChallengeCard key={c.id} c={c} onChange={load} />)}
          {challenges && !challenges.length ? <p className="rk-note">No tienes retos en marcha. Crea uno aquí abajo.</p> : null}

          <section className="rk-section" aria-labelledby="nuevo">
            <SectionHeader id="nuevo">Crear un reto</SectionHeader>
            <div className="reto__new">
              <div className="reto__kinds">
                {KINDS.map((k) => (
                  <button key={k} type="button" aria-pressed={kind === k} className={`reto__kind${kind === k ? ' is-on' : ''}`} onClick={() => setKind(k)}>
                    <span className="reto__kind-label">{KIND_TEXT[k].label}</span>
                    <span className="reto__kind-desc">{KIND_TEXT[k].desc}</span>
                  </button>
                ))}
              </div>
              <Segmented label="Duración" options={[...DURS]} value={dur} onChange={setDur} />

              {friends.length ? (
                <div className="reto__friends" role="group" aria-label="Con quién">
                  {friends.map((f) => (
                    <button key={f.id} type="button" aria-pressed={!!picked[f.id]} className={`reto__friend${picked[f.id] ? ' is-on' : ''}`} onClick={() => setPicked((s) => ({ ...s, [f.id]: !s[f.id] }))}>
                      <Avatar name={f.name} color={colorOf(f.id)} size={28} />
                      {firstName(f.name)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rk-note">
                  Para retar a alguien tenéis que seguiros los dos. <Link to="/tabs/social">Busca amigos</Link>
                </p>
              )}

              <button type="button" className="rk-btn" disabled={!chosen.length || saving} onClick={() => void create()}>
                {chosen.length ? `Crear reto: ${KIND_TEXT[kind].label.toLowerCase()} · ${durLabel}` : 'Elige con quién'}
              </button>
              <span className="reto__fine">Los retos van de moverse y de constancia, nunca de peso ni de comer menos.</span>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
