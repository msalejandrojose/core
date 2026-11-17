import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { brioApi, isApiError, type Food } from '../api';
import { formatKcal } from '../format';
import { iconForFood } from '../ui/food-icons.data';
import { FoodIcon } from '../ui/food-icons';
import { Icon, SearchField, SectionHeader, SheetBar, Stepper } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { defaultGrams, perServing, type RecipeLine } from '../recipes/recipe-math';
import { toast } from '@/lib/toast';
import './pages.css';

const SEARCH_DEBOUNCE_MS = 250;
const MAX_SERVINGS = 24;
const MAX_GRAMS = 5000;
const CLOSE = 'M6 6l12 12M18 6L6 18';

/**
 * Nueva receta (lienzo "Nueva receta"). Los ingredientes salen del catálogo
 * con sus gramos; kcal y macros por ración se recalculan al momento y la API
 * guarda la receta como alimento propio con su «1 ración».
 */
export default function NewRecipePage() {
  const history = useHistory();
  const [name, setName] = useState('');
  const [servings, setServings] = useState(4);
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const timer = window.setTimeout(() => {
      brioApi
        .searchFoods(q)
        .then(setResults)
        .catch(() => setResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const per = perServing(lines, servings);
  const used = lines.filter((l) => l.grams > 0);
  const canSave = name.trim().length >= 2 && used.length > 0 && !saving;
  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/comida/recetas'));
  const toCoach = () => history.push('/tabs/today/coach');

  const add = (food: Food) => {
    setLines((ls) => (ls.some((l) => l.food.id === food.id) ? ls : [...ls, { food, grams: defaultGrams(food) }]));
    setQuery('');
    setResults(null);
    setSearching(false);
  };
  const setGrams = (id: string, value: string) => {
    const grams = Math.min(MAX_GRAMS, Math.max(0, Math.round(Number(value) || 0)));
    setLines((ls) => ls.map((l) => (l.food.id === id ? { ...l, grams } : l)));
  };
  const remove = (id: string) => setLines((ls) => ls.filter((l) => l.food.id !== id));

  const save = async () => {
    if (!canSave) {
      if (!saving)
        toast.info(
          name.trim().length < 2 ? 'Ponle nombre a la receta' : 'Añade al menos un ingrediente',
          'Con nombre e ingredientes con sus gramos ya se puede guardar.',
        );
      return;
    }
    setSaving(true);
    try {
      await brioApi.createRecipe({
        name: name.trim(),
        servings,
        ingredients: used.map((l) => ({ foodId: l.food.id, grams: l.grams })),
      });
      toast.success('Receta guardada', `${formatKcal(per.kcal)} kcal por ración. Ya puedes apuntarla en tus comidas.`);
      history.replace('/tabs/comida/recetas');
    } catch (e) {
      toast.error('No se pudo guardar la receta', isApiError(e) ? e.message : undefined);
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen recipe">
          <SheetBar
            title="Nueva receta"
            onCancel={back}
            action={{ label: saving ? 'Guardando…' : 'Guardar', onClick: () => void save(), disabled: saving }}
          />

          <div className="rk-list">
            <label className="rk-row recipe__name">
              <span className="recipe__label">Nombre</span>
              <input
                type="text"
                value={name}
                maxLength={200}
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
                onPlus={() => setServings((s) => Math.min(MAX_SERVINGS, s + 1))}
              />
            </div>
          </div>

          <section aria-label="Por ración" className="recipe__per">
            <div>
              <span className="recipe__per-kcal">{formatKcal(per.kcal)}</span>
              <span>kcal/ración</span>
            </div>
            <div>
              <span>{per.proteinG} g</span>
              <span>proteína</span>
            </div>
            <div>
              <span>{per.carbsG} g</span>
              <span>hidratos</span>
            </div>
            <div>
              <span>{per.fatG} g</span>
              <span>grasas</span>
            </div>
          </section>

          <section className="rk-section" aria-labelledby="ing">
            <SectionHeader id="ing">Ingredientes · receta completa</SectionHeader>
            <ul className="rk-list recipe__ings">
              {lines.map((l) => (
                <li key={l.food.id} className="recipe__ing">
                  <FoodIcon icon={iconForFood(l.food.name)} size={38} />
                  <span className="recipe__ing-cell">
                    <span className="rk-row__main">
                      <span className="rk-row__title">{l.food.name}</span>
                      <span className="rk-row__sub">
                        {formatKcal(Math.round((l.food.kcalPer100 * l.grams) / 100))} kcal
                      </span>
                    </span>
                    <label className="recipe__grams">
                      <span className="rk-visually-hidden">Gramos de {l.food.name}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={MAX_GRAMS}
                        value={l.grams || ''}
                        placeholder="0"
                        onChange={(e) => setGrams(l.food.id, e.target.value)}
                      />
                      <span aria-hidden="true">g</span>
                    </label>
                    <button
                      type="button"
                      className="recipe__remove"
                      aria-label={`Quitar ${l.food.name}`}
                      onClick={() => remove(l.food.id)}
                    >
                      <Icon d={CLOSE} size={16} stroke={2.2} />
                    </button>
                  </span>
                </li>
              ))}
              <li>
                {searching ? (
                  <div className="recipe__search">
                    <SearchField
                      label="Buscar ingrediente"
                      placeholder="Buscar ingrediente"
                      value={query}
                      onChange={setQuery}
                      autoFocus
                    />
                    {results ? (
                      results.length > 0 ? (
                        <ul className="recipe__results" aria-label="Ingredientes encontrados">
                          {results.map((f) => (
                            <li key={f.id}>
                              <button type="button" className="recipe__result" onClick={() => add(f)}>
                                <FoodIcon icon={iconForFood(f.name)} size={32} />
                                <span className="rk-row__main">
                                  <span className="rk-row__title">{f.name}</span>
                                  <span className="rk-row__sub">
                                    {f.brand ? `${f.brand} · ` : ''}
                                    {formatKcal(f.kcalPer100)} kcal / 100 {f.isLiquid ? 'ml' : 'g'}
                                  </span>
                                </span>
                                <Icon d={PATHS.plus} size={18} stroke={2.2} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="recipe__none">Nada con «{query.trim()}» en el catálogo.</p>
                      )
                    ) : null}
                  </div>
                ) : (
                  <button type="button" className="recipe__add" onClick={() => setSearching(true)}>
                    <Icon d={PATHS.plusCircle} size={24} stroke={1.8} />
                    Añadir ingrediente
                  </button>
                )}
              </li>
            </ul>
          </section>

          <div className="foodday__tools">
            <button type="button" className="rk-tilebtn" onClick={toCoach}>
              <Icon d={PATHS.web} size={18} />
              Importar de web
            </button>
            <button type="button" className="rk-tilebtn" onClick={toCoach}>
              <Icon d={PATHS.camera} size={18} />
              Foto de la receta
            </button>
          </div>
          <p className="rk-note">Para importarla de una web o de una foto, pásasela al coach y la guarda por ti.</p>
        </div>
      </IonContent>
    </IonPage>
  );
}
