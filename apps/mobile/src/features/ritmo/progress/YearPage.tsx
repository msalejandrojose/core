import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ExampleTag } from '../ui/kit';
import './progress.css';

const STORIES = [
  { kicker: 'Diciembre 2026', big: '2026', title: 'Lo has dado todo', line: 'Repasamos tu año en siete historias.' },
  { kicker: 'Entrenos', big: '214', title: 'sesiones este año', line: 'Unas 4 h 15 min por semana. Tu mejor mes fue julio, con 22.' },
  { kicker: 'Carrera', big: '1.284 km', title: 'entre rodajes, series y tiradas', line: 'Tu tirada más larga: 21,1 km, en octubre.' },
  { kicker: 'Fuerza', big: '262 t', title: 'registradas desde Hevy', line: 'Récord del año: press de banca, 8 × 72,5 kg.' },
  { kicker: 'Comida', big: '285 días', title: 'registrando lo que comes', line: 'Tu plato estrella: avena con plátano, 168 veces.' },
  { kicker: 'Constancia', big: '41 días', title: 'tu racha más larga', line: '9 medallas, nivel 4 y 63 ánimos a tus amigos.' },
  { kicker: 'Gracias por este año', big: '2027', title: 'A por el siguiente', line: 'Tu próximo objetivo ya está en el plan.' },
];

/** Tu año en Ritmo (lienzo "Tu año"): historias a pantalla completa. Ejemplo hasta diciembre. */
export default function YearPage() {
  const history = useHistory();
  const [i, setI] = useState(0);
  const s = STORIES[i];
  return (
    <IonPage>
      <IonContent>
        <div className="year">
          <div className="year__dots" style={{ gridTemplateColumns: `repeat(${STORIES.length}, minmax(0, 1fr))` }} aria-hidden="true">
            {STORIES.map((_, k) => (
              <span key={k} className={k <= i ? 'is-on' : undefined} />
            ))}
          </div>
          <div className="rk-navrow">
            <ExampleTag />
            <button
              type="button"
              className="rk-textbtn year__close"
              onClick={() => (history.length > 1 ? history.goBack() : history.replace('/tabs/progress'))}
            >
              Cerrar
            </button>
          </div>
          <div className="year__body" aria-live="polite">
            <span className="year__kicker">{s.kicker}</span>
            <span className="year__big">{s.big}</span>
            <span className="year__title">{s.title}</span>
            <span className="year__line">{s.line}</span>
          </div>
          <div className="year__nav">
            <button type="button" onClick={() => setI((k) => Math.max(0, k - 1))} disabled={i === 0}>
              Anterior
            </button>
            <button type="button" onClick={() => setI((k) => (k < STORIES.length - 1 ? k + 1 : 0))}>
              {i < STORIES.length - 1 ? 'Siguiente' : 'Ver de nuevo'}
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
