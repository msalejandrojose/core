/**
 * Creador de bocatas, tostadas, wraps y burritos (TASK-433): la base (pan o
 * tortilla y cuánto) y sugerencias de lo que se le suele poner, agrupadas.
 * Son solo atajos: en la app se puede añadir cualquier alimento del catálogo,
 * tantos como se quiera. Los nombres son los del
 * catálogo global (`seeds/brio-foods.data.ts` y `seed-brio.ts`). Dominio puro.
 */

export interface SandwichBase {
  code: string;
  /** «Bocata», «Tostada»: da nombre a lo que se monta. */
  kind: 'bocata' | 'tostada' | 'sandwich' | 'wrap' | 'burrito';
  label: string;
  food: string;
  grams: number;
}

export interface IngredientGroup {
  code: string;
  label: string;
  foods: readonly string[];
}

export const SANDWICH_BASES: readonly SandwichBase[] = [
  { code: 'barra', kind: 'bocata', label: 'Media barra', food: 'Pan de barra', grams: 120 },
  { code: 'chapata', kind: 'bocata', label: 'Chapata', food: 'Pan chapata', grams: 100 },
  { code: 'integral', kind: 'bocata', label: 'Pan integral', food: 'Pan integral', grams: 70 },
  { code: 'molde', kind: 'sandwich', label: 'Pan de molde', food: 'Pan de molde', grams: 55 },
  { code: 'tostada', kind: 'tostada', label: 'Tostada', food: 'Pan de barra', grams: 40 },
  { code: 'tostada-integral', kind: 'tostada', label: 'Tostada integral', food: 'Pan integral', grams: 35 },
  { code: 'tostada-centeno', kind: 'tostada', label: 'Tostada de centeno', food: 'Pan de centeno', grams: 35 },
  { code: 'wrap', kind: 'wrap', label: 'Wrap', food: 'Tortilla de trigo para wrap', grams: 60 },
  // Tortilla grande de burrito (~30 cm): más o menos una y media de wrap.
  { code: 'burrito', kind: 'burrito', label: 'Burrito', food: 'Tortilla de trigo para wrap', grams: 90 },
];

export const INGREDIENT_GROUPS: readonly IngredientGroup[] = [
  {
    code: 'proteina',
    label: 'Lo principal',
    foods: [
      'Jamón serrano',
      'Jamón cocido (york)',
      'Pechuga de pavo en lonchas',
      'Atún al natural',
      'Huevo entero',
      'Tortilla francesa',
      'Tortilla de patatas',
      'Pechuga de pollo a la plancha',
      'Filete de ternera a la plancha',
      'Salmón ahumado',
      'Lomo embuchado',
      'Chorizo',
      'Bacon',
    ],
  },
  {
    code: 'queso',
    label: 'Queso',
    foods: ['Queso en lonchas', 'Queso manchego curado', 'Queso fresco tipo Burgos', 'Queso crema'],
  },
  {
    code: 'untar',
    label: 'Para untar',
    foods: [
      'Tomate natural rallado',
      'Aceite de oliva virgen extra',
      'Aguacate',
      'Mantequilla',
      'Hummus',
      'Mayonesa',
      'Crema de cacahuete',
      'Crema de cacao con avellanas',
      'Mermelada',
      'Miel',
    ],
  },
  {
    code: 'verdura',
    label: 'Verdura y fruta',
    foods: ['Tomate en rodajas', 'Lechuga', 'Rúcula', 'Cebolla', 'Pimiento asado', 'Pepino', 'Plátano'],
  },
  {
    code: 'burrito',
    label: 'Para burrito o wrap',
    foods: ['Arroz basmati', 'Guacamole'],
  },
];

/** Todos los nombres de alimento que usa el creador. */
export function sandwichFoodNames(): string[] {
  return [...new Set([...SANDWICH_BASES.map((b) => b.food), ...INGREDIENT_GROUPS.flatMap((g) => g.foods)])];
}
