import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { formatKcal } from '../format';
import type { FoodIconKey } from '../ui/food-icons.data';
import { FoodIcon } from '../ui/food-icons';
import { ExampleTag, Icon, SectionHeader, SheetBar, Stepper } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { toast } from '@/lib/toast';
import './pages.css';

const INGREDIENTS: { n: string; q: string; k: number; p: number; c: number; f: number; icon: FoodIconKey }[] = [
  { n: 'Lentejas pardinas', q: '320 g', k: 1120, p: 77, c: 160, f: 4, icon: 'lentils' },
  { n: 'Chorizo', q: '80 g', k: 360, p: 19, c: 2, f: 31, icon: 'chorizo' },
  { n: 'Patata', q: '300 g', k: 230, p: 6, c: 51, f: 0, icon: 'potato' },
  { n: 'Zanahoria', q: '150 g', k: 60, p: 1, c: 14, f: 0, icon: 'carrot' },
  { n: 'Cebolla', q: '100 g', k: 40, p: 1, c: 9, f: 0, icon: 'onion' },
  { n: 'Aceite de oliva', q: '20 g', k: 180, p: 0, c: 0, f: 20, icon: 'oil' },
];

/**
 * Nueva receta (lienzo "Nueva receta"). Los valores por ración se recalculan
 * al cambiar las raciones, como en el diseño. Guardar llegará con el modelo
 * de recetas en la API; mientras, la pantalla avisa en vez de fingir.
 */
export default function NewRecipePage() {
  const history = useHistory();
  const [name, setName] = useState('Lentejas de la abuela');
  const [servings, setServings] = useState(4);
  const sum = (key: 'k' | 'p' | 'c' | 'f') => INGREDIENTS.reduce((a, g) => a + g[key], 0);
  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/today/recetas'));
  const notYet = () => toast.info('Pronto podrás guardar tus recetas', 'Esta pantalla aún usa datos de ejemplo.');

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen recipe">
          <SheetBar title="Nueva receta" onCancel={back} action={{ label: 'Guardar', onClick: notYet }} />

          <div className="rk-list">
            <label className="rk-row recipe__name">
              <span className="recipe__label">Nombre</span>
              <input
                type="text"
                value={name}
                placeholder="Ej. Lentejas de la abuela"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="rk-row recipe__servings">
              <span className="rk-row__main rk-row__title">Raciones</span>
              <Stepper
                value={servings}
                minusLabel="Una ración menos"
                plusLabel="Una ración más"
                onMinus={() => setServings((s) => Math.max(1, s - 1))}
                onPlus={() => setServings((s) => Math.min(12, s + 1))}
              />
            </div>
          </div>

          <section aria-label="Por ración" className="recipe__per">
            <div>
              <span className="recipe__per-kcal">{formatKcal(Math.round(sum('k') / servings / 10) * 10)}</span>
              <span>kcal/ración</span>
            </div>
            <div>
              <span>{Math.round(sum('p') / servings)} g</span>
              <span>proteína</span>
            </div>
            <div>
              <span>{Math.round(sum('c') / servings)} g</span>
              <span>hidratos</span>
            </div>
            <div>
              <span>{Math.round(sum('f') / servings)} g</span>
              <span>grasas</span>
            </div>
          </section>

          <section className="rk-section" aria-labelledby="ing">
            <SectionHeader id="ing" action={<ExampleTag />}>
              Ingredientes · receta completa
            </SectionHeader>
            <ul className="rk-list recipe__ings">
              {INGREDIENTS.map((g) => (
                <li key={g.n} className="recipe__ing">
                  <FoodIcon icon={g.icon} size={38} />
                  <span className="recipe__ing-cell">
                    <span className="rk-row__main rk-row__title">{g.n}</span>
                    <span className="rk-row__value">{g.q}</span>
                  </span>
                </li>
              ))}
              <li>
                <button type="button" className="recipe__add" onClick={notYet}>
                  <Icon d={PATHS.plusCircle} size={24} stroke={1.8} />
                  Añadir ingrediente
                </button>
              </li>
            </ul>
          </section>

          <div className="foodday__tools">
            <button type="button" className="rk-tilebtn" onClick={notYet}>
              <Icon d={PATHS.web} size={18} />
              Importar de web
            </button>
            <button type="button" className="rk-tilebtn" onClick={notYet}>
              <Icon d={PATHS.camera} size={18} />
              Foto de la receta
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
