import { useCallback, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { IonContent, IonPage, useIonViewWillEnter } from '@ionic/react';
import { brioApi, type Food } from '../api';
import { iconForFood } from '../ui/food-icons.data';
import { FoodIcon } from '../ui/food-icons';
import { BackLink, EmptyCard, Icon, LargeTitle, NavRow, SearchField } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { recipeMeta } from '../recipes/recipe-math';
import './pages.css';

const NEW_RECIPE = '/tabs/today/recetas/nueva';

/**
 * Mis recetas (lienzo "Mis recetas"): los alimentos propios que el usuario
 * guardó como receta, los más nuevos primero. Se recargan al volver a la
 * pantalla para que aparezca la que se acaba de guardar.
 */
export default function RecipesPage() {
  const history = useHistory();
  const [recipes, setRecipes] = useState<Food[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setFailed(false);
    brioApi
      .recipes()
      .then(setRecipes)
      .catch(() => setFailed(true));
  }, []);
  useIonViewWillEnter(load);

  const q = query.trim().toLocaleLowerCase('es');
  const shown = (recipes ?? []).filter((r) => !q || r.name.toLocaleLowerCase('es').includes(q));

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow
            back={<BackLink label="Comida" fallback="/tabs/today/comida" />}
            actions={
              <Link to={NEW_RECIPE} className="rk-iconbtn" aria-label="Nueva receta">
                <Icon d={PATHS.plus} size={22} stroke={2.2} />
              </Link>
            }
          />
          <LargeTitle>Mis recetas</LargeTitle>

          {failed ? (
            <EmptyCard
              tone="food"
              icon={PATHS.book}
              title="No se pudieron cargar tus recetas"
              text="Revisa la conexión y vuelve a intentarlo."
              primary={{ label: 'Reintentar', onClick: load }}
            />
          ) : recipes === null ? (
            <p className="recipes__state">Cargando recetas…</p>
          ) : recipes.length === 0 ? (
            <EmptyCard
              tone="food"
              icon={PATHS.book}
              title="Aún no tienes recetas"
              text="Guarda tus platos con sus ingredientes y apúntalos luego por raciones."
              primary={{ label: 'Nueva receta', onClick: () => history.push(NEW_RECIPE) }}
            />
          ) : (
            <>
              <SearchField label="Buscar receta" placeholder="Buscar receta" value={query} onChange={setQuery} />
              {shown.length > 0 ? (
                <ul aria-label="Recetas guardadas" className="rk-list recipes__list">
                  {shown.map((r) => (
                    <li key={r.id} className="recipes__row">
                      <FoodIcon icon={iconForFood(r.name)} size={52} shape="square" />
                      <span className="recipes__cell">
                        <span className="rk-row__main">
                          <span className="recipes__name">{r.name}</span>
                          <span className="rk-row__sub">{recipeMeta(r)}</span>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="recipes__state">Ninguna receta con «{query.trim()}».</p>
              )}
            </>
          )}
          <p className="rk-note">
            Al añadir una receta a una comida, búscala por su nombre y elige cuántas raciones has tomado.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
