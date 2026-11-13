import { useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { BackLink, NavRow } from '../ui/kit';
import { AISLE_LABEL, menuApi, shoppingText, type ShoppingView } from './menu.api';
import { dayNumber } from './plan-labels';
import './plan.css';

const SHARE = 'M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7';

/** Lista de la compra (lienzo "Lista de la compra"): los ingredientes del menú de la semana, sumados. */
export default function ShoppingPage() {
  const [list, setList] = useState<ShoppingView | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    menuApi
      .shopping()
      .then((l) => alive && setList(l))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  async function toggle(code: string, checked: boolean) {
    if (!list) return;
    const before = list;
    // Se marca al instante; si el servidor falla, vuelve atrás.
    setList({
      ...list,
      done: list.done + (checked ? 1 : -1),
      sections: list.sections.map((s) => ({ ...s, items: s.items.map((i) => (i.code === code ? { ...i, checked } : i)) })),
    });
    try {
      setList(await menuApi.check(code, checked));
    } catch (e) {
      setList(before);
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    }
  }

  async function share() {
    if (!list) return;
    const text = shoppingText(list);
    try {
      if (navigator.share) await navigator.share({ title: 'Lista de la compra', text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Lista copiada', 'Pégala donde quieras enviarla.');
      }
    } catch {
      /* compartir cancelado: no es un error */
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen plan">
          <NavRow
            back={<BackLink label="Dieta" fallback="/tabs/plan/dieta" />}
            actions={
              <button type="button" aria-label="Compartir lista" className="rk-iconbtn" disabled={!list?.total} onClick={() => void share()}>
                <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={SHARE} />
                </svg>
              </button>
            }
          />
          <header className="rk-title">
            <h1>Lista de la compra</h1>
            {list ? (
              <span className="rk-title__sub plan__sub">
                De tu menú del {dayNumber(list.from)} al {dayNumber(list.to)}
              </span>
            ) : null}
          </header>

          {error ? <p className="rk-note">No se pudo cargar la lista. Vuelve a intentarlo.</p> : null}
          {list && !list.total ? <p className="rk-note">Completa tu perfil para tener un objetivo de calorías: de ahí salen el menú y la lista.</p> : null}

          {list?.total ? (
            <>
              <div className="shop__progress">
                <div className="shop__progress-head">
                  <span className="rk-row__title">
                    {list.done} de {list.total} en el carro
                  </span>
                  <span className="rk-row__sub">Cantidades para toda la semana</span>
                </div>
                <div className="plan__bar" aria-hidden="true">
                  <div style={{ width: `${Math.round((list.done / list.total) * 100)}%`, background: 'var(--brio-tint)' }} />
                </div>
              </div>

              {list.sections.map((section) => (
                <section key={section.aisle} className="rk-section">
                  <div className="rk-sechead">
                    <h2>{AISLE_LABEL[section.aisle]}</h2>
                  </div>
                  <div className="shop__list">
                    {section.items.map((item) => (
                      <button key={item.code} type="button" aria-pressed={item.checked} className="shop__item" onClick={() => void toggle(item.code, !item.checked)}>
                        <span className={`shop__check${item.checked ? ' is-on' : ''}`} aria-hidden="true">
                          {item.checked ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12.5l4.5 4.5L19 7" />
                            </svg>
                          ) : null}
                        </span>
                        <span className="shop__cell">
                          <span className={`shop__name${item.checked ? ' is-on' : ''}`}>{item.name}</span>
                          <span className="rk-row__value">{item.quantity}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              <p className="rk-note">Si cambias un plato del menú, la lista se recalcula. Las cantidades van redondeadas hacia arriba.</p>
            </>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
}
