import { useEffect, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { toast } from '@/lib/toast';
import { brioApi, isApiError, type Food, type SandwichBase, type SandwichBuilder } from '../api';
import { FoodTray, type TrayItem } from '../sheets/FoodTray';
import { SWIPE_TO_CLOSE } from '../sheets/swipe';
import { formatKcal } from '../format';
import { iconForFood } from '../ui/food-icons.data';
import { FoodIcon } from '../ui/food-icons';
import { Icon, SearchField, SectionHeader, SheetBar, Switch } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { defaultGramsOf, sandwichItems, sandwichName, toggleLine, type SandwichLine } from './sandwich';
import '../plan/plan.css';
import '../pages/pages.css';
import './sandwich.css';

let cache: SandwichBuilder | null = null;

/** Lo que vuelve a «Añadir alimento»: la receta guardada o los ingredientes sueltos. */
export type SandwichResult = { food: Food } | { items: TrayItem[] };

const MIN_G = 5;
const MAX_G = 400;
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Creador de bocatas, tostadas, wraps y burritos (TASK-433): eliges la base y
 * vas sumando lo que lleva, sin límite: las sugerencias de un toque o cualquier
 * alimento del catálogo con el buscador (tortilla de patatas, ternera…). Cada
 * cosa entra con su cantidad típica (− / + para ajustarla). Abajo, la
 * lista con kcal y macros. Por defecto se guarda como receta propia con su
 * nombre («Bocata de jamón serrano y tomate»), así cuenta como un solo
 * alimento y la próxima vez sale al buscarlo; si no, se apuntan los
 * ingredientes por separado.
 */
export function SandwichBuilderSheet({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (result: SandwichResult) => void;
}) {
  const [data, setData] = useState<SandwichBuilder | null>(cache);
  const [base, setBase] = useState<SandwichBase | null>(null);
  const [baseGrams, setBaseGrams] = useState(0);
  const [lines, setLines] = useState<SandwichLine[]>([]);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[] | null>(null);

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

  useEffect(() => {
    if (!isOpen) return;
    setBase(null);
    setLines([]);
    setQuery('');
    setName('');
    setNameTouched(false);
    setSave(true);
    if (cache) return;
    brioApi
      .sandwichBuilder()
      .then((d) => {
        cache = d;
        setData(d);
      })
      .catch(() => toast.error('No se pudieron cargar los ingredientes'));
  }, [isOpen]);

  const sizedBase = base ? { ...base, grams: baseGrams } : null;
  const autoName = sandwichName(sizedBase, lines);
  useEffect(() => {
    if (!nameTouched) setName(autoName);
  }, [autoName, nameTouched]);
  const items = sandwichItems(sizedBase, lines);

  const pickBase = (b: SandwichBase) => {
    setBase(b);
    setBaseGrams(b.grams);
  };
  const toggle = (food: Food) => setLines((ls) => toggleLine(ls, food));
  /** Desde el buscador: se añade (o se quita si ya iba) y se limpia la búsqueda. */
  const pickResult = (food: Food) => {
    toggle(food);
    setQuery('');
  };
  const step = (key: string, dir: 1 | -1) => {
    if (key === 'base' && base) {
      setBaseGrams((g) => Math.min(MAX_G, Math.max(MIN_G, g + dir * Math.max(5, Math.round(base.grams / 4)))));
      return;
    }
    setLines((ls) =>
      ls.map((l) => {
        if (l.food.id !== key) return l;
        const unit = Math.max(5, Math.round(defaultGramsOf(l.food) / 2));
        return { ...l, grams: Math.min(MAX_G, Math.max(MIN_G, l.grams + dir * unit)) };
      }),
    );
  };
  const remove = (key: string) => (key === 'base' ? setBase(null) : setLines((ls) => ls.filter((l) => l.food.id !== key)));

  async function add() {
    if (!base) return;
    if (!save) {
      onAdd({ items });
      return;
    }
    setBusy(true);
    try {
      const food = await brioApi.createRecipe({
        name: name.trim() || autoName,
        servings: 1,
        ingredients: items.map((i) => ({ foodId: i.foodId as string, grams: i.quantityG })),
      });
      toast.success('Guardado en tus recetas', 'La próxima vez búscalo por su nombre.');
      onAdd({ food });
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const chosen = new Set(lines.map((l) => l.food.id));

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="rk-modal-full" {...SWIPE_TO_CLOSE}>
      <IonContent>
        <div className="rk-sheet sandwich">
          <span className="rk-grab" aria-hidden="true" />
          <SheetBar
            title="Bocata, tostada o burrito"
            onCancel={onClose}
            action={{ label: busy ? 'Guardando…' : 'Añadir', onClick: () => void add(), disabled: busy || !base }}
          />

          <section className="rk-section" aria-labelledby="pan">
            <SectionHeader id="pan">La base</SectionHeader>
            <div className="plan__chips">
              {(data?.bases ?? []).map((b) => (
                <button
                  key={b.code}
                  type="button"
                  aria-pressed={base?.code === b.code}
                  className={`plan__chip${base?.code === b.code ? ' is-on' : ''}`}
                  onClick={() => pickBase(b)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rk-section" aria-labelledby="lleva">
            <SectionHeader id="lleva">Lo que lleva</SectionHeader>
            <SearchField
              label="Buscar ingrediente"
              placeholder="Busca cualquier ingrediente"
              value={query}
              onChange={setQuery}
            />
            {results ? (
              results.length > 0 ? (
                <ul className="recipe__results sandwich__results" aria-label="Ingredientes encontrados">
                  {results.map((f) => (
                    <li key={f.id}>
                      <button type="button" className="recipe__result" aria-pressed={chosen.has(f.id)} onClick={() => pickResult(f)}>
                        <FoodIcon icon={iconForFood(f.name)} size={32} />
                        <span className="rk-row__main">
                          <span className="rk-row__title">{f.name}</span>
                          <span className="rk-row__sub">
                            {f.brand ? `${f.brand} · ` : ''}
                            {formatKcal(f.kcalPer100)} kcal / 100 {f.isLiquid ? 'ml' : 'g'}
                          </span>
                        </span>
                        <Icon d={chosen.has(f.id) ? PATHS.check : PATHS.plus} size={18} stroke={2.2} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="recipe__none">Nada con «{query.trim()}» en el catálogo.</p>
              )
            ) : null}
          </section>

          {(data?.groups ?? []).map((g) => (
            <section key={g.code} className="rk-section" aria-labelledby={`g-${g.code}`}>
              <SectionHeader id={`g-${g.code}`}>{g.label}</SectionHeader>
              <div className="plan__chips">
                {g.foods.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={chosen.has(f.id)}
                    className={`plan__chip${chosen.has(f.id) ? ' is-on' : ''}`}
                    onClick={() => toggle(f)}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </section>
          ))}

          {base ? (
            <>
              <FoodTray
                title="Lleva"
                items={items}
                onRemove={remove}
                portionFor={(it) => (
                  <span className="addfood__portion" role="group" aria-label={`Cantidad de ${it.name}`}>
                    <button type="button" aria-label={`Menos ${it.name}`} onClick={() => step(it.key, -1)}>
                      −
                    </button>
                    <span className="addfood__portion-value">{Math.round(it.quantityG)} g</span>
                    <button type="button" aria-label={`Más ${it.name}`} onClick={() => step(it.key, 1)}>
                      +
                    </button>
                  </span>
                )}
              />
              <div className="rk-list sandwich__opts">
                <label className="rk-row sandwich__name">
                  <span className="sandwich__label">Nombre</span>
                  <input
                    value={name}
                    maxLength={120}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameTouched(true);
                    }}
                  />
                </label>
                <button type="button" className="rk-row" aria-pressed={save} onClick={() => setSave((v) => !v)}>
                  <span className="rk-row__main">
                    <span className="rk-row__title">Guardar en mis recetas</span>
                    <span className="rk-row__sub">
                      {save ? 'Cuenta como un alimento y la próxima vez sale al buscarlo' : 'Se apuntan el pan y cada ingrediente por separado'}
                    </span>
                  </span>
                  <Switch on={save} />
                </button>
              </div>
            </>
          ) : (
            <p className="rk-note">
              Elige la base y añade lo que lleva, tantas cosas como quieras: toca una sugerencia o busca cualquier
              ingrediente. Cada cosa entra con su cantidad típica.
            </p>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
}
