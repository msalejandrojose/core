import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IamModule } from '../iam/iam.module';
import { RITMO_ACCOUNT_REPOSITORY } from './application/ports/ritmo-account-repository.port';
import { RITMO_ACTIVITY_REPOSITORY } from './application/ports/ritmo-activity-repository.port';
import { RITMO_BODY_REPOSITORY } from './application/ports/ritmo-body-repository.port';
import { RITMO_DIARY_REPOSITORY } from './application/ports/ritmo-diary-repository.port';
import { RITMO_FOOD_REPOSITORY } from './application/ports/ritmo-food-repository.port';
import { RITMO_PERFORMANCE_REPOSITORY } from './application/ports/ritmo-performance-repository.port';
import { RITMO_PLAN_REPOSITORY } from './application/ports/ritmo-plan-repository.port';
import { RITMO_PROFILE_REPOSITORY } from './application/ports/ritmo-profile-repository.port';
import { AddPerformanceMeasurementUseCase } from './application/use-cases/add-performance-measurement.use-case';
import { CreateExerciseUseCase } from './application/use-cases/create-exercise.use-case';
import { DeletePerformanceMeasurementUseCase } from './application/use-cases/delete-performance-measurement.use-case';
import { GetCardioAnalysisUseCase } from './application/use-cases/get-cardio-analysis.use-case';
import { GetFatigueAnalysisUseCase } from './application/use-cases/get-fatigue-analysis.use-case';
import { GetHybridAnalysisUseCase } from './application/use-cases/get-hybrid-analysis.use-case';
import { PerformanceDataLoader } from './application/use-cases/performance-data.loader';
import { GetPerformanceSummaryUseCase } from './application/use-cases/get-performance-summary.use-case';
import { GetRecommendationsUseCase } from './application/use-cases/get-recommendations.use-case';
import { SetRecommendationStatusUseCase } from './application/use-cases/set-recommendation-status.use-case';
import { GetMuscleAnalysisUseCase } from './application/use-cases/get-muscle-analysis.use-case';
import { GetStrengthAnalysisUseCase } from './application/use-cases/get-strength-analysis.use-case';
import { GetActivitySessionUseCase } from './application/use-cases/get-activity-session.use-case';
import { ListActivitySessionsUseCase } from './application/use-cases/list-activity-sessions.use-case';
import { UpdateActivitySessionUseCase } from './application/use-cases/update-activity-session.use-case';
import {
  ArchivePlanUseCase,
  ClearPlannedDayUseCase,
  CompletePlannedDayUseCase,
  FillPlanWeekUseCase,
  GetPlanWeekUseCase,
  SavePlanUseCase,
  SetPlannedDayUseCase,
} from './application/use-cases/plan.use-cases';
import { GetHeartConfigUseCase } from './application/use-cases/get-heart-config.use-case';
import { ListExercisesUseCase } from './application/use-cases/list-exercises.use-case';
import { ListPerformanceMeasurementsUseCase } from './application/use-cases/list-performance-measurements.use-case';
import { ReplaceSessionSetsUseCase } from './application/use-cases/replace-session-sets.use-case';
import { SetExerciseMusclesUseCase } from './application/use-cases/set-exercise-muscles.use-case';
import { SaveHeartConfigUseCase } from './application/use-cases/save-heart-config.use-case';
import { CreateFoodUseCase } from './application/use-cases/create-food.use-case';
import { DeleteMyAccountUseCase } from './application/use-cases/delete-my-account.use-case';
import { ExportMyDataUseCase } from './application/use-cases/export-my-data.use-case';
import { DeleteActivitySessionUseCase } from './application/use-cases/delete-activity-session.use-case';
import { DeleteMealEntryUseCase } from './application/use-cases/delete-meal-entry.use-case';
import { GetDaySummaryUseCase } from './application/use-cases/get-day-summary.use-case';
import { GetMealHabitsUseCase } from './application/use-cases/get-meal-habits.use-case';
import { GetMyProfileUseCase } from './application/use-cases/get-my-profile.use-case';
import { GetProgressUseCase } from './application/use-cases/get-progress.use-case';
import { ListActivityTypesUseCase } from './application/use-cases/list-activity-types.use-case';
import { LogActivitySessionUseCase } from './application/use-cases/log-activity-session.use-case';
import { LogMealEntryUseCase } from './application/use-cases/log-meal-entry.use-case';
import { LogWeightUseCase } from './application/use-cases/log-weight.use-case';
import { RefreshDailyLogUseCase } from './application/use-cases/refresh-daily-log.use-case';
import { SaveMyProfileUseCase } from './application/use-cases/save-my-profile.use-case';
import { SearchFoodsUseCase } from './application/use-cases/search-foods.use-case';
import { PrismaRitmoAccountRepository } from './infrastructure/persistence/prisma-ritmo-account.repository';
import { PrismaRitmoActivityRepository } from './infrastructure/persistence/prisma-ritmo-activity.repository';
import { PrismaRitmoBodyRepository } from './infrastructure/persistence/prisma-ritmo-body.repository';
import { PrismaRitmoDiaryRepository } from './infrastructure/persistence/prisma-ritmo-diary.repository';
import { PrismaRitmoFoodRepository } from './infrastructure/persistence/prisma-ritmo-food.repository';
import { PrismaRitmoPerformanceRepository } from './infrastructure/persistence/prisma-ritmo-performance.repository';
import { PrismaRitmoPlanRepository } from './infrastructure/persistence/prisma-ritmo-plan.repository';
import { PrismaRitmoProfileRepository } from './infrastructure/persistence/prisma-ritmo-profile.repository';
import { RitmoAccountController } from './infrastructure/http/ritmo-account.controller';
import { RitmoActivityController } from './infrastructure/http/ritmo-activity.controller';
import { RitmoDiaryController } from './infrastructure/http/ritmo-diary.controller';
import { RitmoNutritionController } from './infrastructure/http/ritmo-nutrition.controller';
import { RitmoPerformanceController } from './infrastructure/http/ritmo-performance.controller';
import { RitmoPerformanceInputsController } from './infrastructure/http/ritmo-performance-inputs.controller';
import { RitmoPlanController } from './infrastructure/http/ritmo-plan.controller';
import { RitmoHevyController } from './infrastructure/http/ritmo-hevy.controller';
import { RitmoGarminController } from './infrastructure/http/ritmo-garmin.controller';
import { PrismaRitmoGarminRepository } from './infrastructure/persistence/prisma-ritmo-garmin.repository';
import { HttpGarminClient } from './infrastructure/garmin/http-garmin.client';
import {
  GARMIN_CLIENT,
  RITMO_GARMIN_REPOSITORY,
} from './application/ports/garmin.port';
import {
  ConnectGarminUseCase,
  DisconnectGarminUseCase,
  GetGarminStatusUseCase,
  GetRecentHealthUseCase,
  SyncGarminUseCase,
} from './application/use-cases/garmin.use-cases';
import { PrismaRitmoHevyRepository } from './infrastructure/persistence/prisma-ritmo-hevy.repository';
import { HttpHevyClient } from './infrastructure/hevy/http-hevy.client';
import {
  HEVY_CLIENT,
  RITMO_HEVY_REPOSITORY,
  RITMO_SECRET_CIPHER,
} from './application/ports/hevy.port';
import {
  ConnectHevyUseCase,
  DisconnectHevyUseCase,
  GetHevyStatusUseCase,
  SendPlannedRoutineToHevyUseCase,
  SyncHevyUseCase,
} from './application/use-cases/hevy.use-cases';
import { AesSecretCipher } from '../notifications/infrastructure/crypto/aes-secret-cipher';
import { NullSecretCipher } from '../notifications/infrastructure/crypto/null-secret-cipher';
import { RitmoProfileController } from './infrastructure/http/ritmo-profile.controller';

// Ritmo — actividad física y calorías (proyecto de la rama `ritmo-dev`).
//
// Importa IamModule por los guards de `@Auth()`/`@CurrentUser()`: todos los
// endpoints están scopeados al usuario autenticado, no hay administración de
// datos de otros usuarios desde aquí.
@Module({
  imports: [IamModule],
  controllers: [
    RitmoProfileController,
    RitmoActivityController,
    RitmoNutritionController,
    RitmoDiaryController,
    RitmoAccountController,
    RitmoPerformanceInputsController,
    RitmoPerformanceController,
    RitmoPlanController,
    RitmoHevyController,
    RitmoGarminController,
  ],
  providers: [
    {
      provide: RITMO_PROFILE_REPOSITORY,
      useClass: PrismaRitmoProfileRepository,
    },
    { provide: RITMO_BODY_REPOSITORY, useClass: PrismaRitmoBodyRepository },
    {
      provide: RITMO_ACTIVITY_REPOSITORY,
      useClass: PrismaRitmoActivityRepository,
    },
    { provide: RITMO_FOOD_REPOSITORY, useClass: PrismaRitmoFoodRepository },
    { provide: RITMO_DIARY_REPOSITORY, useClass: PrismaRitmoDiaryRepository },
    { provide: RITMO_PLAN_REPOSITORY, useClass: PrismaRitmoPlanRepository },
    { provide: RITMO_HEVY_REPOSITORY, useClass: PrismaRitmoHevyRepository },
    { provide: HEVY_CLIENT, useClass: HttpHevyClient },
    { provide: RITMO_GARMIN_REPOSITORY, useClass: PrismaRitmoGarminRepository },
    { provide: GARMIN_CLIENT, useClass: HttpGarminClient },
    {
      // Cifrado de las claves de terceros (Hevy, Garmin). Usa `RITMO_ENC_KEY` o, si no
      // está, la de notificaciones. Sin ninguna (dev/CI) no cifra, y avisa.
      provide: RITMO_SECRET_CIPHER,
      useFactory: (config: ConfigService) => {
        const key =
          config.get<string>('RITMO_ENC_KEY') ??
          config.get<string>('NOTIFICATIONS_ENC_KEY');
        if (key) return new AesSecretCipher(key);
        new Logger('RitmoModule').warn(
          'RITMO_ENC_KEY no definida — las claves de Hevy y Garmin NO se cifran en BBDD.',
        );
        return new NullSecretCipher();
      },
      inject: [ConfigService],
    },
    {
      provide: RITMO_PERFORMANCE_REPOSITORY,
      useClass: PrismaRitmoPerformanceRepository,
    },
    {
      provide: RITMO_ACCOUNT_REPOSITORY,
      useClass: PrismaRitmoAccountRepository,
    },

    // Compartido por todas las escrituras del diario: mantiene
    // `ritmo_daily_log` en sync con sus partes.
    RefreshDailyLogUseCase,

    GetMyProfileUseCase,
    GetMealHabitsUseCase,
    SaveMyProfileUseCase,
    LogWeightUseCase,
    ListActivityTypesUseCase,
    LogActivitySessionUseCase,
    DeleteActivitySessionUseCase,
    ListActivitySessionsUseCase,
    GetActivitySessionUseCase,
    UpdateActivitySessionUseCase,
    SearchFoodsUseCase,
    CreateFoodUseCase,
    LogMealEntryUseCase,
    DeleteMealEntryUseCase,
    GetDaySummaryUseCase,
    GetProgressUseCase,
    ExportMyDataUseCase,
    DeleteMyAccountUseCase,

    // Datos de entrada del motor de rendimiento.
    AddPerformanceMeasurementUseCase,
    CreateExerciseUseCase,
    DeletePerformanceMeasurementUseCase,
    GetHeartConfigUseCase,
    ListExercisesUseCase,
    ListPerformanceMeasurementsUseCase,
    ReplaceSessionSetsUseCase,
    SaveHeartConfigUseCase,
    SetExerciseMusclesUseCase,

    // Motores de rendimiento.
    GetStrengthAnalysisUseCase,
    GetMuscleAnalysisUseCase,
    GetCardioAnalysisUseCase,
    PerformanceDataLoader,
    GetFatigueAnalysisUseCase,
    GetHybridAnalysisUseCase,
    GetPerformanceSummaryUseCase,
    GetRecommendationsUseCase,
    SetRecommendationStatusUseCase,

    // Plan de entrenamiento.
    GetPlanWeekUseCase,
    SavePlanUseCase,
    ArchivePlanUseCase,
    SetPlannedDayUseCase,
    ClearPlannedDayUseCase,
    CompletePlannedDayUseCase,
    FillPlanWeekUseCase,
    // Hevy.
    GetHevyStatusUseCase,
    SyncHevyUseCase,
    ConnectHevyUseCase,
    DisconnectHevyUseCase,
    SendPlannedRoutineToHevyUseCase,
    // Garmin y salud diaria.
    GetGarminStatusUseCase,
    SyncGarminUseCase,
    ConnectGarminUseCase,
    DisconnectGarminUseCase,
    GetRecentHealthUseCase,
  ],
})
export class RitmoModule {}
