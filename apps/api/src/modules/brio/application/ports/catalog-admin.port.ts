export const BRIO_CATALOG_ADMIN = Symbol('BRIO_CATALOG_ADMIN');

export type Measure = 'REPS' | 'DISTANCE' | 'TIME' | 'CALORIES';
export type ActivityKind =
  | 'STRENGTH'
  | 'RUN'
  | 'CYCLE'
  | 'WALK'
  | 'HIKE'
  | 'SWIM'
  | 'ELLIPTICAL'
  | 'OTHER_CARDIO'
  | 'OTHER';

export interface AdminFood {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: 'CURATED' | 'OPEN_FOOD_FACTS' | 'USER';
  isVerified: boolean;
  isLiquid: boolean;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  servings: { label: string; grams: number; isDefault: boolean }[];
  /** Veces que se ha apuntado (para saber qué importa revisar). */
  uses: number;
}

export interface SaveFoodInput {
  name: string;
  brand: string | null;
  barcode: string | null;
  isVerified: boolean;
  isLiquid: boolean;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  servings: { label: string; grams: number; isDefault: boolean }[];
}

export interface AdminExercise {
  id: string;
  code: string | null;
  name: string;
  measure: Measure;
  isCompound: boolean;
  isBodyweight: boolean;
  isArchived: boolean;
  muscles: { muscle: string; weight: number }[];
  /** Series registradas con él. */
  uses: number;
}

export interface SaveExerciseInput {
  code: string | null;
  name: string;
  measure: Measure;
  isCompound: boolean;
  isBodyweight: boolean;
  isArchived: boolean;
  muscles: { muscle: string; weight: number }[];
}

export interface AdminActivityType {
  id: string;
  code: string | null;
  name: string;
  met: number;
  kind: ActivityKind;
  icon: string | null;
  isArchived: boolean;
  uses: number;
}

export interface SaveActivityTypeInput {
  code: string | null;
  name: string;
  met: number;
  kind: ActivityKind;
  icon: string | null;
  isArchived: boolean;
}

/** Catálogos globales de Brío (sin dueño): alimentos, ejercicios y tipos de actividad. */
export interface BrioCatalogAdminPort {
  listFoods(q: {
    search: string | null;
    source: AdminFood['source'] | null;
    unverified: boolean;
    page: number;
    pageSize: number;
  }): Promise<{ data: AdminFood[]; total: number }>;
  createFood(input: SaveFoodInput): Promise<AdminFood>;
  updateFood(id: string, input: SaveFoodInput): Promise<AdminFood | null>;
  deleteFood(id: string): Promise<boolean>;
  barcodeTaken(barcode: string, exceptId: string | null): Promise<boolean>;

  listExercises(search: string | null): Promise<AdminExercise[]>;
  createExercise(input: SaveExerciseInput): Promise<AdminExercise>;
  updateExercise(
    id: string,
    input: SaveExerciseInput,
  ): Promise<AdminExercise | null>;
  exerciseCodeTaken(code: string, exceptId: string | null): Promise<boolean>;

  listActivityTypes(): Promise<AdminActivityType[]>;
  createActivityType(input: SaveActivityTypeInput): Promise<AdminActivityType>;
  updateActivityType(
    id: string,
    input: SaveActivityTypeInput,
  ): Promise<AdminActivityType | null>;
  activityCodeTaken(code: string, exceptId: string | null): Promise<boolean>;
}
