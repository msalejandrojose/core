import { Inject, Injectable } from '@nestjs/common';
import type { BodyMeasurement } from '../../domain/entities/body-measurement.entity';
import { computeEnergyTargets } from '../../domain/services/energy';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
  type SaveMeasurementData,
} from '../ports/ritmo-body-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/** Igual que `SaveMeasurementData`, pero el día es opcional. */
export interface LogWeightInput extends Omit<
  SaveMeasurementData,
  'measuredOn'
> {
  measuredOn: string | null;
}

/**
 * Registrar una pesada. Dispara dos efectos derivados, y por eso no es un
 * simple insert:
 *  1. Los targets del perfil dependen del peso → se recalculan.
 *  2. El agregado del día muestra el peso → se refresca.
 */
@Injectable()
export class LogWeightUseCase {
  constructor(
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(input: LogWeightInput): Promise<BodyMeasurement> {
    const profile = await this.profiles.findByUserId(input.userId);
    // El día natural lo decide la zona horaria del perfil, no el cliente.
    const measuredOn =
      input.measuredOn ??
      dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid');
    const data: SaveMeasurementData = { ...input, measuredOn };

    const measurement = await this.body.save(data);

    if (profile) {
      // Solo recalculamos con el peso MÁS RECIENTE, que no es necesariamente
      // el que se acaba de registrar (se puede rellenar una pesada atrasada).
      const latestWeightKg = await this.body.latestWeightKg(data.userId);
      const targets = computeEnergyTargets({
        weightKg: latestWeightKg,
        heightCm: profile.heightCm,
        birthDate: profile.birthDate,
        sex: profile.sex,
        activityLevel: profile.activityLevel,
        goalType: profile.goalType,
        weeklyWeightChangeKg: profile.weeklyWeightChangeKg,
        today: new Date(),
      });
      if (targets) {
        await this.profiles.updateTargets(data.userId, {
          bmrKcal: targets.bmrKcal,
          tdeeKcal: targets.tdeeKcal,
          dailyKcalTarget: targets.dailyKcalTarget,
          proteinTargetG: targets.proteinTargetG,
          carbsTargetG: targets.carbsTargetG,
          fatTargetG: targets.fatTargetG,
          weeklyWeightChangeKg: targets.weeklyWeightChangeKg,
        });
      }
    }

    await this.refreshDailyLog.execute(data.userId, measuredOn);
    return measurement;
  }
}
