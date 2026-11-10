import { Inject, Injectable } from '@nestjs/common';
import type { RitmoProfile } from '../../domain/entities/ritmo-profile.entity';
import { RitmoProfileNotFoundError } from '../../domain/errors/ritmo-profile-not-found.error';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
} from '../ports/ritmo-body-repository.port';

export interface MyProfile {
  profile: RitmoProfile;
  /** Último peso registrado, que es lo que la app muestra junto al objetivo. */
  currentWeightKg: number | null;
}

@Injectable()
export class GetMyProfileUseCase {
  constructor(
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<MyProfile> {
    const profile = await this.profiles.findByUserId(userId);
    // 404 con level `info`: para la app significa "aún no has hecho el
    // onboarding", no un error que haya que reportar.
    if (!profile) throw new RitmoProfileNotFoundError(userId);
    return {
      profile,
      currentWeightKg: await this.body.latestWeightKg(userId),
    };
  }
}
