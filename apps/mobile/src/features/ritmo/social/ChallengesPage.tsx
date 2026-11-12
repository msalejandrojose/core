import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { BackLink, ExampleTag, LargeTitle, NavRow, SectionHeader, Segmented } from '../ui/kit';
import { Avatar } from './Avatar';
import { personById } from './social-data';
import './social.css';

const RANKING = [
  { name: 'Laura', color: 'var(--ritmo-tint)', n: 4 },
  { name: 'Tú', color: '#8E8E93', n: 3, me: true },
  { name: 'Marcos', color: 'var(--ritmo-activity-ink)', n: 3 },
  { name: 'Carmen', color: 'var(--ritmo-food-ink)', n: 2 },
];
const MAX = 6;

const KINDS = [
  { id: 'sesiones', label: 'Más sesiones', desc: 'Gana quien más entrene' },
  { id: 'pasos', label: 'Pasos en equipo', desc: 'Sumáis entre todos' },
  { id: 'km', label: 'Kilómetros', desc: 'Correr, andar o bici' },
  { id: 'registro', label: 'Constancia', desc: 'Registrar comidas cada día' },
] as const;
const DURS = [
  { value: 'semana', label: '1 semana' },
  { value: 'dos', label: '2 semanas' },
  { value: 'mes', label: '1 mes' },
] as const;
type Kind = (typeof KINDS)[number]['id'];
type Dur = (typeof DURS)[number]['value'];

const GROUP = ['laura', 'marcos', 'carmen'].map((id) => personById(id)!);

/** Social › Retos (lienzo "Retos"): reto activo, otros retos y crear uno. */
export default function ChallengesPage() {
  const [kind, setKind] = useState<Kind>('sesiones');
  const [dur, setDur] = useState<Dur>('semana');
  const [cheered, setCheered] = useState(false);
  const kindLabel = KINDS.find((k) => k.id === kind)!.label.toLowerCase();
  const durLabel = DURS.find((d) => d.value === dur)!.label;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen social">
          <NavRow back={<BackLink label="Amigos" fallback="/tabs/social" />} />
          <LargeTitle sub={<ExampleTag />}>Retos</LargeTitle>

          <section aria-label="Reto activo" className="reto__card">
            <div className="reto__head">
              <div className="rk-row__main">
                <span className="reto__kicker">Competición · quedan 3 días</span>
                <span className="reto__title">Más sesiones esta semana</span>
              </div>
              <svg aria-hidden="true" width="40" height="46" viewBox="0 0 60 70">
                <path d="M20 2h8l4 20-8 4z" fill="var(--ritmo-gold-deep)" />
                <path d="M40 2h-8l-4 20 8 4z" fill="var(--ritmo-gold-deep)" />
                <circle cx="30" cy="44" r="22" fill="var(--ritmo-gold)" />
                <g transform="translate(18 32)">
                  <path d="M8 4h8v5a4 4 0 0 1-8 0zM12 13v4M8 20h8" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </svg>
            </div>
            <ol className="reto__ranking">
              {RANKING.map((r, i) => (
                <li key={r.name}>
                  <span className="reto__pos">{i + 1}</span>
                  <Avatar name={r.me ? 'T' : r.name} color={r.color} size={32} />
                  <div className="rk-row__main reto__line">
                    <div className="reto__line-head">
                      <span className={r.me ? 'reto__me' : undefined}>{r.name}</span>
                      <span className="reto__n">{r.n}</span>
                    </div>
                    <div className="social__bar" aria-hidden="true">
                      <div style={{ width: `${Math.round((r.n / MAX) * 100)}%`, background: r.me ? 'var(--ritmo-tint)' : 'var(--ritmo-border-strong)' }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <span className="rk-row__sub reto__hint">Te falta 1 sesión para empatar con Laura. Mañana tienes series.</span>
            <button
              type="button"
              aria-pressed={cheered}
              className={`reto__cheer${cheered ? ' is-on' : ''}`}
              onClick={() => setCheered((v) => !v)}
            >
              {cheered ? 'Has animado al grupo' : 'Animar al grupo'}
            </button>
          </section>

          <section className="rk-section" aria-labelledby="otros">
            <SectionHeader id="otros">Otros retos</SectionHeader>
            <div className="rk-list">
              <div className="social__goal">
                <div className="social__goal-head">
                  <span className="rk-row__title">300.000 pasos en equipo</span>
                  <span className="reto__tag reto__tag--coop">Cooperativo</span>
                </div>
                <div className="social__bar" aria-hidden="true">
                  <div style={{ width: '68%', background: 'var(--ritmo-activity)' }} />
                </div>
                <span className="rk-row__sub">204.300 de 300.000 · tú llevas 36.560 · 4 personas</span>
              </div>
              <div className="social__goal">
                <div className="social__goal-head">
                  <span className="rk-row__title">5 cenas caseras con Laura</span>
                  <span className="reto__tag reto__tag--pair">En pareja</span>
                </div>
                <div className="social__bar" aria-hidden="true">
                  <div style={{ width: '60%', background: 'var(--ritmo-info)' }} />
                </div>
                <span className="rk-row__sub">3 de 5 · usáis la misma lista de la compra</span>
              </div>
            </div>
          </section>

          <section className="rk-section" aria-labelledby="nuevo">
            <SectionHeader id="nuevo">Crear un reto</SectionHeader>
            <div className="reto__new">
              <div className="reto__kinds">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    aria-pressed={kind === k.id}
                    className={`reto__kind${kind === k.id ? ' is-on' : ''}`}
                    onClick={() => setKind(k.id)}
                  >
                    <span className="reto__kind-label">{k.label}</span>
                    <span className="reto__kind-desc">{k.desc}</span>
                  </button>
                ))}
              </div>
              <Segmented label="Duración" options={[...DURS]} value={dur} onChange={setDur} />
              <div className="reto__group">
                <span className="reto__stack" aria-hidden="true">
                  {GROUP.map((p) => (
                    <Avatar key={p.id} name={p.name} color={p.color} size={32} />
                  ))}
                </span>
                <span className="reto__group-names">Laura, Marcos y Carmen</span>
                <Link to="/tabs/social" className="rk-textbtn reto__change">
                  Cambiar
                </Link>
              </div>
              <button
                type="button"
                className="rk-btn"
                onClick={() => toast.info('Pronto podrás crear retos', 'Llegarán cuando puedas seguir a tus amigos.')}
              >
                Crear reto: {kindLabel} · {durLabel}
              </button>
              <span className="reto__fine">Los retos van de moverse y de constancia, nunca de peso ni de comer menos.</span>
            </div>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
