import type { NutreProfile } from '../../domain/entities/nutre-profile.entity';

export const NUTRE_PROFILE_REPOSITORY = Symbol('NUTRE_PROFILE_REPOSITORY');

/** Datos que el usuario elige; los targets los calcula el dominio. */
export interface SaveProfileData {
  userId: string;
  sex: NutreProfile['sex'];
  birthDate: string | null;
  heightCm: number | null;
  activityLevel: NutreProfile['activityLevel'];
  goalType: NutreProfile['goalType'];
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

export interface NutreProfileRepositoryPort {
  findByUserId(userId: string): Promise<NutreProfile | null>;
  /** Alta o actualización del perfil (una fila por usuario). */
  save(data: SaveProfileData, targets: ProfileTargets): Promise<NutreProfile>;
  /**
   * Reescribe solo los targets. Se usa al registrar una pesada: el objetivo
   * depende del peso, pero el usuario no ha tocado su perfil.
   */
  updateTargets(userId: string, targets: ProfileTargets): Promise<NutreProfile>;
}
