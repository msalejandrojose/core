import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  digestionDays,
  digestionSummary,
  periodStart,
  type BowelAmount,
  type BowelMovement,
  type BristolType,
  type DigestionDay,
  type DigestionPeriod,
  type DigestionSummary,
} from '../../domain/services/digestion';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';
import {
  BRIO_DIGESTION_REPOSITORY,
  type BrioDigestionRepositoryPort,
} from '../ports/digestion.port';

export interface DigestionView {
  period: DigestionPeriod;
  summary: DigestionSummary;
  /** Días del periodo con alguna, para el calendario. */
  days: DigestionDay[];
  /** Las últimas del periodo, la más reciente primero. */
  recent: BowelMovement[];
}

const RECENT = 10;

@Injectable()
export class DigestionUseCases {
  constructor(
    @Inject(BRIO_DIGESTION_REPOSITORY)
    private readonly digestion: BrioDigestionRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
  ) {}

  private async timezone(userId: string): Promise<string> {
    const profile = await this.profiles.findByUserId(userId);
    return profile?.timezone ?? 'Europe/Madrid';
  }

  async log(
    userId: string,
    input: { bristolType: BristolType; amount: BowelAmount; occurredAt?: Date },
  ): Promise<BowelMovement> {
    const occurredAt = input.occurredAt ?? new Date();
    return this.digestion.create({
      userId,
      occurredAt,
      loggedOn: dayInTimezone(occurredAt, await this.timezone(userId)),
      bristolType: input.bristolType,
      amount: input.amount,
    });
  }

  async view(userId: string, period: DigestionPeriod): Promise<DigestionView> {
    const today = dayInTimezone(new Date(), await this.timezone(userId));
    const [entries, firstDay] = await Promise.all([
      this.digestion.listSince(userId, periodStart(period, today)),
      this.digestion.firstDay(userId),
    ]);
    return {
      period,
      summary: digestionSummary(entries, period, today, firstDay),
      days: digestionDays(entries),
      recent: entries.slice(0, RECENT),
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    if (!(await this.digestion.delete(id, userId))) {
      throw new NotFoundException('BRIO_BOWEL_MOVEMENT_NOT_FOUND');
    }
  }
}
