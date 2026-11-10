import { Inject, Injectable } from '@nestjs/common';
import { computeEnergyTargets } from '../../domain/services/energy';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
  type SaveProfileData,
} from '../ports/ritmo-profile-repository.port';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
} from '../ports/ritmo-body-repository.port';
import type { MyProfile } from './get-my-profile.use-case';

/**
 * Onboarding y edición del perfil. Guarda lo que elige el usuario y recalcula
 * los targets derivados en el mismo paso: el perfil y su objetivo nunca quedan
 * en estados incoherentes.
 */
@Injectable()
export class SaveMyProfileUseCase {
  constructor(
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
  ) {}

  async execute(data: SaveProfileData): Promise<MyProfile> {
    const currentWeightKg = await this.body.latestWeightKg(data.userId);

    const targets = computeEnergyTargets({
      weightKg: currentWeightKg,
      heightCm: data.heightCm,
      birthDate: data.birthDate,
      sex: data.sex,
      activityLevel: data.activityLevel,
      goalType: data.goalType,
      weeklyWeightChangeKg: data.weeklyWeightChangeKg,
      today: new Date(),
    });

    // Sin peso/altura/edad no hay objetivo que calcular. Se guarda el perfil
    // igual (el onboarding puede ir por pasos) con los targets a null.
    const profile = await this.profiles.save(data, {
      bmrKcal: targets?.bmrKcal ?? null,
      tdeeKcal: targets?.tdeeKcal ?? null,
      dailyKcalTarget: targets?.dailyKcalTarget ?? null,
      proteinTargetG: targets?.proteinTargetG ?? null,
      carbsTargetG: targets?.carbsTargetG ?? null,
      fatTargetG: targets?.fatTargetG ?? null,
      weeklyWeightChangeKg:
        targets?.weeklyWeightChangeKg ?? data.weeklyWeightChangeKg,
    });

    return { profile, currentWeightKg };
  }
}
