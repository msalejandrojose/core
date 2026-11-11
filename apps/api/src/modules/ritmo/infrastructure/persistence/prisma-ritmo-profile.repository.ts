import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { RitmoProfile } from '../../domain/entities/ritmo-profile.entity';
import type {
  ProfileTargets,
  RitmoProfileRepositoryPort,
  SaveProfileData,
} from '../../application/ports/ritmo-profile-repository.port';
import { toDateOnly, toProfile } from './ritmo.mapper';

@Injectable()
export class PrismaRitmoProfileRepository implements RitmoProfileRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<RitmoProfile | null> {
    const row = await this.prisma.ritmoProfile.findUnique({ where: { userId } });
    return row ? toProfile(row) : null;
  }

  async save(
    data: SaveProfileData,
    targets: ProfileTargets,
  ): Promise<RitmoProfile> {
    const values = {
      sex: data.sex,
      birthDate: data.birthDate ? toDateOnly(data.birthDate) : null,
      heightCm: data.heightCm,
      activityLevel: data.activityLevel,
      goalType: data.goalType,
      targetWeightKg: data.targetWeightKg,
      timezone: data.timezone,
      ...targets,
    };

    const row = await this.prisma.ritmoProfile.upsert({
      where: { userId: data.userId },
      update: values,
      // `onboardedAt` se sella en la primera escritura: marca cuándo alguien
      // terminó el onboarding y no se vuelve a tocar al editar el perfil.
      create: { userId: data.userId, onboardedAt: new Date(), ...values },
    });
    return toProfile(row);
  }

  async updateTargets(
    userId: string,
    targets: ProfileTargets,
  ): Promise<RitmoProfile> {
    const row = await this.prisma.ritmoProfile.update({
      where: { userId },
      data: targets,
    });
    return toProfile(row);
  }
}
