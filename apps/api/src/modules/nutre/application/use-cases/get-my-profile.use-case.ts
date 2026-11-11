import { Inject, Injectable } from '@nestjs/common';
import type { NutreProfile } from '../../domain/entities/nutre-profile.entity';
import { NutreProfileNotFoundError } from '../../domain/errors/nutre-profile-not-found.error';
import {
  NUTRE_PROFILE_REPOSITORY,
  type NutreProfileRepositoryPort,
} from '../ports/nutre-profile-repository.port';
import {
  NUTRE_BODY_REPOSITORY,
  type NutreBodyRepositoryPort,
} from '../ports/nutre-body-repository.port';

export interface MyProfile {
  profile: NutreProfile;
  /** Último peso registrado, que es lo que la app muestra junto al objetivo. */
  currentWeightKg: number | null;
}

@Injectable()
export class GetMyProfileUseCase {
  constructor(
    @Inject(NUTRE_PROFILE_REPOSITORY)
    private readonly profiles: NutreProfileRepositoryPort,
    @Inject(NUTRE_BODY_REPOSITORY)
    private readonly body: NutreBodyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<MyProfile> {
    const profile = await this.profiles.findByUserId(userId);
    // 404 con level `info`: para la app significa "aún no has hecho el
    // onboarding", no un error que haya que reportar.
    if (!profile) throw new NutreProfileNotFoundError(userId);
    return {
      profile,
      currentWeightKg: await this.body.latestWeightKg(userId),
    };
  }
}
