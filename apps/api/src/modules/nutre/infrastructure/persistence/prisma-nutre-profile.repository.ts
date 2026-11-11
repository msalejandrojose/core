import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { NutreProfile } from '../../domain/entities/nutre-profile.entity';
import type {
  ProfileTargets,
  NutreProfileRepositoryPort,
  SaveProfileData,
} from '../../application/ports/nutre-profile-repository.port';
import { toDateOnly, toProfile } from './nutre.mapper';

@Injectable()
export class PrismaNutreProfileRepository implements NutreProfileRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<NutreProfile | null> {
    const row = await this.prisma.nutreProfile.findUnique({ where: { userId } });
    return row ? toProfile(row) : null;
  }

  async save(
    data: SaveProfileData,
    targets: ProfileTargets,
  ): Promise<NutreProfile> {
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

    const row = await this.prisma.nutreProfile.upsert({
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
  ): Promise<NutreProfile> {
    const row = await this.prisma.nutreProfile.update({
      where: { userId },
      data: targets,
    });
    return toProfile(row);
  }
}
