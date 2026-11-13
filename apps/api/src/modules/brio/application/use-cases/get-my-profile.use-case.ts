import { Inject, Injectable } from '@nestjs/common';
import type { BrioProfile } from '../../domain/entities/brio-profile.entity';
import { BrioProfileNotFoundError } from '../../domain/errors/brio-profile-not-found.error';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';

export interface MyProfile {
  profile: BrioProfile;
  /** Último peso registrado, que es lo que la app muestra junto al objetivo. */
  currentWeightKg: number | null;
}

@Injectable()
export class GetMyProfileUseCase {
  constructor(
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<MyProfile> {
    const profile = await this.profiles.findByUserId(userId);
    // 404 con level `info`: para la app significa "aún no has hecho el
    // onboarding", no un error que haya que reportar.
    if (!profile) throw new BrioProfileNotFoundError(userId);
    return {
      profile,
      currentWeightKg: await this.body.latestWeightKg(userId),
    };
  }
}
