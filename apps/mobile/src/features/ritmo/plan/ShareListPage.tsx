import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { SectionHeader, Switch } from '../ui/kit';
import { Avatar } from '../social/Avatar';
import { PEOPLE, invite } from '../social/social-data';
import { usePlanWeek } from './usePlanWeek';
import '../profile/profile.css';
import './plan.css';

const FRIENDS = PEOPLE.slice(0, 4);

/** Compartir lista (lienzo "Compartir lista"). Sin backend: compartir avisa; el enlace sí se comparte. */
export default function ShareListPage() {
  const history = useHistory();
  const { days } = usePlanWeek();
  const [sel, setSel] = useState<Record<string, boolean>>({ laura: true });
  const [notify, setNotify] = useState(true);
  const n = FRIENDS.filter((p) => sel[p.id]).length;
  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/plan/compra'));

  async function link() {
    const r = await invite();
    if (r === 'copied') toast.success('Enlace copiado', 'Quien lo abra podrá ver la lista sin la app.');
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet plan-sheet">
          <span className="rk-grab" aria-hidden="true" />
          <div className="rk-sheetbar">
            <button type="button" className="rk-textbtn" onClick={back}>
              Cancelar
            </button>
            <span className="rk-sheetbar__title">Compartir lista</span>
            <span />
          </div>

          <div className="share-list__card">
            <span className="share-list__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6M10 21h.01M17 21h.01" />
              </svg>
            </span>
            <span className="rk-row__main">
              <span className="rk-row__title">Lista de la compra</span>
              <span className="rk-row__sub">
                17 productos · semana del {days[0].n} al {days[6].n}
              </span>
            </span>
          </div>

          <section className="rk-section" aria-labelledby="quien">
            <SectionHeader id="quien">Con quién</SectionHeader>
            <div className="profile__radios">
              {FRIENDS.map((p) => {
                const on = !!sel[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    className="profile__radio-row"
                    onClick={() => setSel((s) => ({ ...s, [p.id]: !s[p.id] }))}
                  >
                    <span className="profile__radio-wrap" aria-hidden="true">
                      <span className={`shop__check${on ? ' is-on' : ''}`}>
                        {on ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.5l4.5 4.5L19 7" />
                          </svg>
                        ) : null}
                      </span>
                    </span>
                    <span className="profile__radio-cell share-list__cell">
                      <Avatar name={p.name} color={p.color} size={36} />
                      <span className="rk-row__main">
                        <span className="rk-row__title">{p.name}</span>
                        <span className="rk-row__sub">{p.id === 'laura' ? 'Ya está en la lista' : p.user}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rk-section" aria-labelledby="pueden">
            <SectionHeader id="pueden">Qué pueden hacer</SectionHeader>
            <div className="rk-list">
              <div className="rk-row">
                <span className="rk-row__main rk-row__title">Añadir productos y marcarlos al cogerlos</span>
              </div>
              <button type="button" aria-pressed={notify} className="rk-row plan__toggle" onClick={() => setNotify((v) => !v)}>
                <span className="rk-row__main">
                  <span className="rk-row__title">Avisarme de los cambios</span>
                  <span className="rk-row__sub">Cuando alguien añada o marque algo</span>
                </span>
                <Switch on={notify} />
              </button>
            </div>
          </section>

          <button type="button" className="delete__export share-list__link" onClick={() => void link()}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
            <span>Invitar con enlace (sin la app)</span>
          </button>

          <button
            type="button"
            className="rk-btn share-list__go"
            disabled={!n}
            onClick={() => toast.info('Pronto podrás compartir la lista', 'Llegará con Social y el plan.')}
          >
            {n ? `Compartir con ${n === 1 ? '1 persona' : `${n} personas`}` : 'Elige con quién'}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
