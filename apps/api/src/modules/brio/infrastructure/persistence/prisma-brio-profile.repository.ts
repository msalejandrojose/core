import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { BrioProfile } from '../../domain/entities/brio-profile.entity';
import type {
  ProfileTargets,
  BrioProfileRepositoryPort,
  SaveProfileData,
} from '../../application/ports/brio-profile-repository.port';
import { toDateOnly, toProfile } from './brio.mapper';

@Injectable()
export class PrismaBrioProfileRepository implements BrioProfileRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<BrioProfile | null> {
    const row = await this.prisma.brioProfile.findUnique({
      where: { userId },
    });
    return row ? toProfile(row) : null;
  }

  async save(
    data: SaveProfileData,
    targets: ProfileTargets,
  ): Promise<BrioProfile> {
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

    const row = await this.prisma.brioProfile.upsert({
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
  ): Promise<BrioProfile> {
    const row = await this.prisma.brioProfile.update({
      where: { userId },
      data: targets,
    });
    return toProfile(row);
  }
}
