import type { BrioProfile } from '../../domain/entities/brio-profile.entity';

export const BRIO_PROFILE_REPOSITORY = Symbol('BRIO_PROFILE_REPOSITORY');

/** Datos que el usuario elige; los targets los calcula el dominio. */
export interface SaveProfileData {
  userId: string;
  sex: BrioProfile['sex'];
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: BrioProfile['activityLevel'];
  goalType: BrioProfile['goalType'];
  targetWeightKg: number | null;
  weeklyWeightChangeKg: number | null;
  timezone: string;
}

/** Targets derivados, recalculados al guardar el perfil o al pesarse. */
export interface ProfileTargets {
  bmrKcal: number | null;
  tdeeKcal: number | null;
  dailyKcalTarget: number | null;
  proteinTargetG: number | null;
  carbsTargetG: number | null;
  fatTargetG: number | null;
  weeklyWeightChangeKg: number | null;
}

export interface BrioProfileRepositoryPort {
  findByUserId(userId: string): Promise<BrioProfile | null>;
  /** Alta o actualización del perfil (una fila por usuario). */
  save(data: SaveProfileData, targets: ProfileTargets): Promise<BrioProfile>;
  /**
   * Reescribe solo los targets. Se usa al registrar una pesada: el objetivo
   * depende del peso, pero el usuario no ha tocado su perfil.
   */
  updateTargets(userId: string, targets: ProfileTargets): Promise<BrioProfile>;
}
