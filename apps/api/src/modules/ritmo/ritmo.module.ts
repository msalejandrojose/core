import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { RITMO_ACCOUNT_REPOSITORY } from './application/ports/ritmo-account-repository.port';
import { RITMO_ACTIVITY_REPOSITORY } from './application/ports/ritmo-activity-repository.port';
import { RITMO_BODY_REPOSITORY } from './application/ports/ritmo-body-repository.port';
import { RITMO_DIARY_REPOSITORY } from './application/ports/ritmo-diary-repository.port';
import { RITMO_FOOD_REPOSITORY } from './application/ports/ritmo-food-repository.port';
import { RITMO_PERFORMANCE_REPOSITORY } from './application/ports/ritmo-performance-repository.port';
import { RITMO_PROFILE_REPOSITORY } from './application/ports/ritmo-profile-repository.port';
import { AddPerformanceMeasurementUseCase } from './application/use-cases/add-performance-measurement.use-case';
import { CreateExerciseUseCase } from './application/use-cases/create-exercise.use-case';
import { DeletePerformanceMeasurementUseCase } from './application/use-cases/delete-performance-measurement.use-case';
import { GetCardioAnalysisUseCase } from './application/use-cases/get-cardio-analysis.use-case';
import { GetFatigueAnalysisUseCase } from './application/use-cases/get-fatigue-analysis.use-case';
import { GetHybridAnalysisUseCase } from './application/use-cases/get-hybrid-analysis.use-case';
import { PerformanceDataLoader } from './application/use-cases/performance-data.loader';
import { GetMuscleAnalysisUseCase } from './application/use-cases/get-muscle-analysis.use-case';
import { GetStrengthAnalysisUseCase } from './application/use-cases/get-strength-analysis.use-case';
import { GetHeartConfigUseCase } from './application/use-cases/get-heart-config.use-case';
import { ListExercisesUseCase } from './application/use-cases/list-exercises.use-case';
import { ListPerformanceMeasurementsUseCase } from './application/use-cases/list-performance-measurements.use-case';
import { ReplaceSessionSetsUseCase } from './application/use-cases/replace-session-sets.use-case';
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
import { PrismaRitmoProfileRepository } from './infrastructure/persistence/prisma-ritmo-profile.repository';
import { RitmoAccountController } from './infrastructure/http/ritmo-account.controller';
import { RitmoActivityController } from './infrastructure/http/ritmo-activity.controller';
import { RitmoDiaryController } from './infrastructure/http/ritmo-diary.controller';
import { RitmoNutritionController } from './infrastructure/http/ritmo-nutrition.controller';
import { RitmoPerformanceController } from './infrastructure/http/ritmo-performance.controller';
import { RitmoPerformanceInputsController } from './infrastructure/http/ritmo-performance-inputs.controller';
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

    // Motores de rendimiento.
    GetStrengthAnalysisUseCase,
    GetMuscleAnalysisUseCase,
    GetCardioAnalysisUseCase,
    PerformanceDataLoader,
    GetFatigueAnalysisUseCase,
    GetHybridAnalysisUseCase,
  ],
})
export class RitmoModule {}
