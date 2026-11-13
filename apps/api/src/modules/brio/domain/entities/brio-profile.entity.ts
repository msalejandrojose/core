// Perfil de Brío de un usuario (una fila de `brio_profile`). Entidad de
// dominio pura: sin Nest, sin Prisma.
//
// Los targets (`bmrKcal`, `tdeeKcal`, `dailyKcalTarget`, macros) son valores
// DERIVADOS que se persisten: se recalculan al guardar el perfil o al registrar
// una pesada, no en cada lectura. Así el histórico conserva con qué objetivo se
// vivió cada día aunque mañana cambien las fórmulas.
export type Sex = 'MALE' | 'FEMALE' | 'OTHER';

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'ACTIVE'
  | 'VERY_ACTIVE';

export type GoalType = 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_MUSCLE';

export interface BrioProfile {
  id: string;
  userId: string;
  sex: Sex | null;
  /** Fecha de nacimiento como día natural (`YYYY-MM-DD`). */
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeightKg: number | null;
  /** kg/semana objetivo; negativo = déficit. */
  weeklyWeightChangeKg: number | null;
  bmrKcal: number | null;
  tdeeKcal: number | null;
  dailyKcalTarget: number | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  timezone: string;
  onboardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
