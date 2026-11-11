import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import type { FoodIconKey } from '../ui/food-icons.data';
import { FoodIcon } from '../ui/food-icons';
import { BackLink, Chevron, ExampleTag, Icon, LargeTitle, NavRow, SearchField } from '../ui/kit';
import { PATHS } from '../ui/paths';
import './pages.css';

/**
 * Mis recetas (lienzo "Mis recetas"). Aún no hay recetas en la API: la lista
 * es la del diseño y va marcada como ejemplo hasta que existan.
 */
const RECIPES: { name: string; icon: FoodIconKey; meta: string; used: string }[] = [
  { name: 'Lentejas de la abuela', icon: 'stew', meta: '4 raciones · 500 kcal/ración', used: 'Usada 7 veces · última ayer' },
  { name: 'Pollo al curry con arroz', icon: 'curry', meta: '3 raciones · 620 kcal/ración', used: 'Usada 5 veces' },
  { name: 'Bowl de avena proteico', icon: 'oats', meta: '1 ración · 480 kcal', used: 'Usada 12 veces' },
  { name: 'Tortilla de patata', icon: 'omelette', meta: '6 raciones · 310 kcal/ración', used: 'Usada 3 veces' },
  { name: 'Ensalada de pasta', icon: 'pasta', meta: '2 raciones · 540 kcal/ración', used: 'Usada 4 veces' },
];

export default function RecipesPage() {
  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow
            back={<BackLink label="Comida" fallback="/tabs/today/comida" />}
            actions={
              <Link to="/tabs/today/recetas/nueva" className="rk-iconbtn" aria-label="Nueva receta">
                <Icon d={PATHS.plus} size={22} stroke={2.2} />
              </Link>
            }
          />
          <LargeTitle>Mis recetas</LargeTitle>
          <SearchField label="Buscar receta" placeholder="Buscar receta" />

          <ul aria-label="Recetas guardadas" className="rk-list recipes__list">
            {RECIPES.map((r) => (
              <li key={r.name}>
                <Link to="/tabs/today/recetas/nueva" className="recipes__row">
                  <FoodIcon icon={r.icon} size={52} shape="square" />
                  <span className="recipes__cell">
                    <span className="rk-row__main">
                      <span className="recipes__name">{r.name}</span>
                      <span className="rk-row__sub">{r.meta}</span>
                      <span className="recipes__used">{r.used}</span>
                    </span>
                    <Chevron />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="rk-note">
            Al añadir una receta a una comida solo eliges cuántas raciones has tomado. <ExampleTag />
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
