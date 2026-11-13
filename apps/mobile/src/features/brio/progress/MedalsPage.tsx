import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { BackLink, ExampleTag, Icon, LargeTitle, NavRow, SectionHeader } from '../ui/kit';
import './progress.css';

type Tier = 'oro' | 'plata' | 'bronce' | null;
const TIER: Record<Exclude<Tier, null>, { fill: string; label: string }> = {
  oro: { fill: 'var(--brio-gold)', label: 'Oro' },
  plata: { fill: 'var(--brio-silver)', label: 'Plata' },
  bronce: { fill: 'var(--brio-bronze)', label: 'Bronce' },
};

const GROUPS: { title: string; medals: { id: string; name: string; desc: string; tier: Tier; sub: string; isNew?: boolean }[] }[] = [
  {
    title: 'Entreno',
    medals: [
      { id: 'semana', name: 'Semana perfecta', desc: 'Completa todas las sesiones planificadas de una semana.', tier: 'oro', sub: 'el lunes 2 nov' },
      { id: 'racha', name: 'Racha de 30 días', desc: 'Entrena o muévete 30 días seguidos.', tier: 'plata', sub: '24 de 30' },
      { id: 'toneladas', name: '100 toneladas', desc: 'Suma 100 t de volumen de fuerza registradas desde Hevy.', tier: null, sub: '62 de 100 t' },
    ],
  },
  {
    title: 'Comida',
    medals: [
      { id: 'registro', name: '7 días registrando', desc: 'Registra todas tus comidas 7 días seguidos.', tier: 'bronce', sub: 'en octubre' },
      { id: 'proteina', name: 'Proteína de hierro', desc: 'Llega a tu objetivo de proteína 5 días en una semana.', tier: null, sub: '3 días esta semana' },
      { id: 'chef', name: 'Chef de casa', desc: 'Guarda 5 recetas propias.', tier: 'bronce', sub: 'en septiembre' },
    ],
  },
  {
    title: 'Hábitos y amigos',
    medals: [
      { id: 'descanso', name: 'Buen descanso', desc: 'Duerme 7 h o más las 7 noches de una semana.', tier: null, sub: '5 noches esta semana' },
      { id: 'animo', name: 'Primer ánimo', desc: 'Da ánimo a un amigo por un logro.', tier: 'bronce', sub: 'en octubre' },
      { id: 'compra', name: 'Compra en equipo', desc: 'Comparte tu lista de la compra con un amigo.', tier: 'plata', sub: 'hoy', isNew: true },
    ],
  },
];

/** Medallas (lienzo "Medallas"). Aún no hay medallas en la API: es el ejemplo del diseño. */
export default function MedalsPage() {
  const all = GROUPS.flatMap((g) => g.medals);
  const [sel, setSel] = useState(all.find((m) => m.isNew)?.id ?? all[0].id);
  const cur = all.find((m) => m.id === sel)!;
  const won = all.filter((m) => m.tier).length;
  const points = all.reduce((s, m) => s + (m.tier === 'oro' ? 200 : m.tier === 'plata' ? 100 : m.tier === 'bronce' ? 50 : 0), 0);

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Progreso" fallback="/tabs/progress" />} actions={<ExampleTag />} />
          <LargeTitle sub={`${won} de ${all.length} conseguidas`}>Medallas</LargeTitle>

          <section className="rk-card medals__level" aria-label="Nivel">
            <div className="goal__head">
              <strong style={{ color: 'var(--brio-ink)', fontSize: 17 }}>Nivel 4</strong>
              <span>{points} puntos</span>
            </div>
            <div className="goal__track" aria-hidden="true">
              <div style={{ width: `${(points % 250) / 2.5}%`, background: 'var(--brio-gold)' }} />
            </div>
            <span className="rk-row__sub">Bronce 50, plata 100, oro 200 puntos</span>
          </section>

          <section className="rk-card medals__level" aria-live="polite">
            <div className="goal__head">
              <strong style={{ color: 'var(--brio-ink)', fontSize: 17 }}>{cur.name}</strong>
              {cur.tier ? <span className="brio-chip brio-chip--done">{TIER[cur.tier].label}</span> : <span className="brio-chip brio-chip--ongoing">En curso</span>}
            </div>
            <span className="brio-callout">{cur.desc}</span>
            <span className="rk-row__sub">{cur.tier ? `Conseguida ${cur.sub}` : cur.sub}</span>
            {cur.tier ? (
              <Link to="/tabs/progress/compartir" className="rk-btn rk-btn--soft rk-btn--small">
                Compartir en redes
              </Link>
            ) : null}
          </section>

          {GROUPS.map((g) => (
            <section key={g.title} className="rk-section">
              <SectionHeader>{g.title}</SectionHeader>
              <div className="medals__grid">
                {g.medals.map((m) => (
                  <button key={m.id} type="button" className="medal" aria-pressed={m.id === sel} onClick={() => setSel(m.id)}>
                    <span className={`medal__disc${m.tier ? '' : ' is-locked'}`} style={m.tier ? { background: TIER[m.tier].fill } : undefined}>
                      <Icon d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" size={24} stroke={1.8} />
                    </span>
                    <span className="medal__name">
                      {m.name}
                      {m.isNew ? ' · NUEVA' : ''}
                    </span>
                    <span className="medal__sub">{m.sub}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
}
