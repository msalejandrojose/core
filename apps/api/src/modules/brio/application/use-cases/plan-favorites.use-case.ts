import { Inject, Injectable } from '@nestjs/common';
import { dayInTimezone, shiftDay } from '../../domain/services/calendar';
import { PLAN_TEMPLATES } from '../../domain/services/plan';
import {
  planFavorites,
  type PlanFavorite,
} from '../../domain/services/plan-favorites';
import {
  BRIO_PLAN_REPOSITORY,
  type BrioPlanRepositoryPort,
} from '../ports/brio-plan-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';
import {
  BRIO_ROUTINE_REPOSITORY,
  type BrioRoutineRepositoryPort,
} from '../ports/routine.port';

/** Semanas hacia atrás que cuentan para «lo que más repites». */
const WEEKS_BACK = 12;

/**
 * Lo que más planifica o hace la persona (rutinas y sesiones tipo), para
 * ponerlo arriba al planificar un día. Cuenta las últimas 12 semanas y lo ya
 * planificado de las próximas dos.
 */
@Injectable()
export class GetPlanFavoritesUseCase {
  constructor(
    @Inject(BRIO_PLAN_REPOSITORY)
    private readonly plans: BrioPlanRepositoryPort,
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly routines: BrioRoutineRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
  ) {}

  async execute(userId: string, limit = 5): Promise<PlanFavorite[]> {
    const profile = await this.profiles.findByUserId(userId);
    const today = dayInTimezone(
      new Date(),
      profile?.timezone ?? 'Europe/Madrid',
    );
    const [planned, routines] = await Promise.all([
      this.plans.plannedBetween(
        userId,
        shiftDay(today, -WEEKS_BACK * 7),
        shiftDay(today, 14),
      ),
      this.routines.list(userId),
    ]);
    return planFavorites(planned, routines, PLAN_TEMPLATES, limit);
  }
}
