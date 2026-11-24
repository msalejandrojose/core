import { useEffect, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { toast } from '@/lib/toast';
import { brioApi, isApiError, type Food, type SandwichBase, type SandwichBuilder } from '../api';
import { FoodTray, type TrayItem } from '../sheets/FoodTray';
import { SWIPE_TO_CLOSE } from '../sheets/swipe';
import { SectionHeader, SheetBar, Switch } from '../ui/kit';
import { defaultGramsOf, sandwichItems, sandwichName, type SandwichLine } from './sandwich';
import '../plan/plan.css';
import './sandwich.css';

let cache: SandwichBuilder | null = null;

/** Lo que vuelve a «Añadir alimento»: la receta guardada o los ingredientes sueltos. */
export type SandwichResult = { food: Food } | { items: TrayItem[] };

const MIN_G = 5;
const MAX_G = 400;

/**
 * Creador de bocatas y tostadas (TASK-433): eliges el pan y vas sumando lo que
 * lleva, cada cosa con su cantidad típica (− / + para ajustarla). Abajo, la
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

  useEffect(() => {
    if (!isOpen) return;
    setBase(null);
    setLines([]);
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
  const toggle = (food: Food) =>
    setLines((ls) => (ls.some((l) => l.food.id === food.id) ? ls.filter((l) => l.food.id !== food.id) : [...ls, { food, grams: defaultGramsOf(food) }]));
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
            title="Bocata o tostada"
            onCancel={onClose}
            action={{ label: busy ? 'Guardando…' : 'Añadir', onClick: () => void add(), disabled: busy || !base }}
          />

          <section className="rk-section" aria-labelledby="pan">
            <SectionHeader id="pan">El pan</SectionHeader>
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
            <p className="rk-note">Elige el pan y ve tocando lo que lleva. Cada cosa entra con su cantidad típica.</p>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
}
