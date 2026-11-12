import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { BackLink, ExampleTag, NavRow } from '../ui/kit';
import { usePlanStore } from './plan-data';
import { usePlanWeek } from './usePlanWeek';
import './plan.css';

type Item = [id: string, name: string, qty: string, by?: string];
const SECTIONS: [string, Item[]][] = [
  ['Fruta y verdura', [['platanos', 'Plátanos', '7 uds'], ['manzanas', 'Manzanas', '4 uds'], ['tomates', 'Tomates', '1 kg'], ['lechuga', 'Lechuga', '2 uds'], ['aguacates', 'Aguacates', '3 uds']]],
  ['Carne, pescado y huevos', [['pollo', 'Pechuga de pollo', '900 g'], ['salmon', 'Salmón', '600 g'], ['merluza', 'Merluza', '400 g'], ['huevos', 'Huevos', '12 uds', 'Laura']]],
  ['Lácteos', [['yogur', 'Yogur griego', '7 uds'], ['leche', 'Leche semidesnatada', '2 L', 'Laura']]],
  ['Despensa', [['avena', 'Copos de avena', '500 g'], ['arroz', 'Arroz', '1 kg'], ['pasta', 'Pasta', '500 g'], ['lentejas', 'Lentejas pardinas', '400 g'], ['nueces', 'Nueces', '200 g'], ['cafe', 'Café molido', '250 g', 'Lo añadió Laura']]],
];
const SHOPPING_COUNT = SECTIONS.reduce((n, [, items]) => n + items.length, 0);

const SHARE = 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7';

/** Lista de la compra (lienzo "Lista de la compra"), de ejemplo; marcar solo vive en esta sesión. */
export default function ShoppingPage() {
  const { days } = usePlanWeek();
  const got = usePlanStore((s) => s.got);
  const toggle = usePlanStore((s) => s.toggleGot);
  const done = SECTIONS.reduce((n, [, items]) => n + items.filter(([id]) => got[id]).length, 0);

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen plan">
          <NavRow
            back={<BackLink label="Dieta" fallback="/tabs/plan/dieta" />}
            actions={
              <Link to="/tabs/plan/compra/compartir" aria-label="Compartir lista" className="rk-iconbtn">
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={SHARE} />
                </svg>
              </Link>
            }
          />
          <header className="rk-title">
            <h1>Lista de la compra</h1>
            <span className="rk-title__sub plan__sub">
              De tu dieta del {days[0].n} al {days[6].n} <ExampleTag />
            </span>
          </header>

          <Link to="/tabs/plan/compra/compartir" className="shop__shared">
            <span className="shop__shared-avatars" aria-hidden="true">
              <span className="shop__me" />
              <span className="shop__laura">L</span>
            </span>
            <span className="rk-row__main">
              <span className="rk-row__title">Compartida con Laura</span>
              <span className="rk-row__sub">Laura marcó 2 productos hace 10 min</span>
            </span>
          </Link>

          <div className="shop__progress">
            <div className="shop__progress-head">
              <span className="rk-row__title">
                {done} de {SHOPPING_COUNT} en el carro
              </span>
              <span className="rk-row__sub">Sin lo que ya tienes en casa</span>
            </div>
            <div className="plan__bar" aria-hidden="true">
              <div style={{ width: `${Math.round((done / SHOPPING_COUNT) * 100)}%`, background: 'var(--ritmo-tint)' }} />
            </div>
          </div>

          {SECTIONS.map(([title, items]) => (
            <section key={title} className="rk-section">
              <div className="rk-sechead">
                <h2>{title}</h2>
              </div>
              <div className="shop__list">
                {items.map(([id, name, qty, by]) => {
                  const on = !!got[id];
                  return (
                    <button key={id} type="button" aria-pressed={on} className="shop__item" onClick={() => toggle(id)}>
                      <span className={`shop__check${on ? ' is-on' : ''}`} aria-hidden="true">
                        {on ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.5l4.5 4.5L19 7" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="shop__cell">
                        <span className={`shop__name${on ? ' is-on' : ''}`}>{name}</span>
                        {by ? <span className="shop__by">{by}</span> : null}
                        <span className="rk-row__value">{qty}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
}
