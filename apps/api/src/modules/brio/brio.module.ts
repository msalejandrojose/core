import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IamModule } from '../iam/iam.module';
import { BRIO_ACCOUNT_REPOSITORY } from './application/ports/brio-account-repository.port';
import { BRIO_ACTIVITY_REPOSITORY } from './application/ports/brio-activity-repository.port';
import { BRIO_BODY_REPOSITORY } from './application/ports/brio-body-repository.port';
import { BRIO_DIARY_REPOSITORY } from './application/ports/brio-diary-repository.port';
import { BRIO_FOOD_REPOSITORY } from './application/ports/brio-food-repository.port';
import { BRIO_PERFORMANCE_REPOSITORY } from './application/ports/brio-performance-repository.port';
import { BRIO_PLAN_REPOSITORY } from './application/ports/brio-plan-repository.port';
import { BRIO_PROFILE_REPOSITORY } from './application/ports/brio-profile-repository.port';
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
  WeekTemplateUseCase,
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
import { CreateRecipeUseCase } from './application/use-cases/create-recipe.use-case';
import { ListRecipesUseCase } from './application/use-cases/list-recipes.use-case';
import { DeleteMyAccountUseCase } from './application/use-cases/delete-my-account.use-case';
import { ExportMyDataUseCase } from './application/use-cases/export-my-data.use-case';
import { DeleteActivitySessionUseCase } from './application/use-cases/delete-activity-session.use-case';
import { UpdateMealEntryUseCase } from './application/use-cases/update-meal-entry.use-case';
import { DeleteMealEntryUseCase } from './application/use-cases/delete-meal-entry.use-case';
import { GetDaySummaryUseCase } from './application/use-cases/get-day-summary.use-case';
import { GetMealHabitsUseCase } from './application/use-cases/get-meal-habits.use-case';
import { GetMyProfileUseCase } from './application/use-cases/get-my-profile.use-case';
import { GetProgressUseCase } from './application/use-cases/get-progress.use-case';
import { ListActivityTypesUseCase } from './application/use-cases/list-activity-types.use-case';
import { LogActivitySessionUseCase } from './application/use-cases/log-activity-session.use-case';
import { LogMealEntryUseCase } from './application/use-cases/log-meal-entry.use-case';
import { BrioHealthDeviceController } from './infrastructure/http/brio-health-device.controller';
import { PrismaBrioDeviceHealthRepository } from './infrastructure/persistence/prisma-brio-device-health.repository';
import { BRIO_DEVICE_HEALTH_REPOSITORY } from './application/ports/device-health.port';
import {
  DisconnectHealthDeviceUseCase,
  GetHealthDeviceStatusUseCase,
  ImportDeviceHealthUseCase,
} from './application/use-cases/device-health.use-cases';
import { BrioRoutineController } from './infrastructure/http/brio-routine.controller';
import { PrismaBrioRoutineRepository } from './infrastructure/persistence/prisma-brio-routine.repository';
import { BRIO_ROUTINE_REPOSITORY } from './application/ports/routine.port';
import {
  ArchiveRoutineUseCase,
  CreateRoutineFromTemplateUseCase,
  GetPreviousSetsUseCase,
  ListRoutineTemplatesUseCase,
  GetRoutineUseCase,
  LinkSessionToRoutineUseCase,
  ListRoutinesUseCase,
  SaveRoutineUseCase,
  SendRoutineToHevyUseCase,
  SyncRoutineWithGarminUseCase,
} from './application/use-cases/routine.use-cases';
import {
  AdminBrioActivityTypesController,
  AdminBrioExercisesController,
  AdminBrioFoodsController,
} from './infrastructure/http/admin-brio-catalog.controller';
import { PrismaBrioCatalogAdminRepository } from './infrastructure/persistence/prisma-brio-catalog-admin.repository';
import { BRIO_CATALOG_ADMIN } from './application/ports/catalog-admin.port';
import { CatalogAdminUseCases } from './application/use-cases/catalog-admin.use-cases';
import { OPEN_FOOD_FACTS } from './application/ports/open-food-facts.port';
import { HttpOpenFoodFactsClient } from './infrastructure/open-food-facts/http-open-food-facts.client';
import { LogWeightUseCase } from './application/use-cases/log-weight.use-case';
import { RefreshDailyLogUseCase } from './application/use-cases/refresh-daily-log.use-case';
import { SaveMyProfileUseCase } from './application/use-cases/save-my-profile.use-case';
import { SearchFoodsUseCase } from './application/use-cases/search-foods.use-case';
import { PrismaBrioAccountRepository } from './infrastructure/persistence/prisma-brio-account.repository';
import { PrismaBrioActivityRepository } from './infrastructure/persistence/prisma-brio-activity.repository';
import { PrismaBrioBodyRepository } from './infrastructure/persistence/prisma-brio-body.repository';
import { PrismaBrioDiaryRepository } from './infrastructure/persistence/prisma-brio-diary.repository';
import { PrismaBrioFoodRepository } from './infrastructure/persistence/prisma-brio-food.repository';
import { PrismaBrioPerformanceRepository } from './infrastructure/persistence/prisma-brio-performance.repository';
import { PrismaBrioPlanRepository } from './infrastructure/persistence/prisma-brio-plan.repository';
import { PrismaBrioProfileRepository } from './infrastructure/persistence/prisma-brio-profile.repository';
import { BrioAccountController } from './infrastructure/http/brio-account.controller';
import { BrioActivityController } from './infrastructure/http/brio-activity.controller';
import { BrioDiaryController } from './infrastructure/http/brio-diary.controller';
import { BrioNutritionController } from './infrastructure/http/brio-nutrition.controller';
import { BrioRecipesController } from './infrastructure/http/brio-recipes.controller';
import { BrioPerformanceController } from './infrastructure/http/brio-performance.controller';
import { BrioPerformanceInputsController } from './infrastructure/http/brio-performance-inputs.controller';
import { BrioPlanController } from './infrastructure/http/brio-plan.controller';
import { BrioMenuController } from './infrastructure/http/brio-menu.controller';
import { PrismaBrioMenuRepository } from './infrastructure/persistence/prisma-brio-menu.repository';
import { BRIO_MENU_REPOSITORY } from './application/ports/menu.port';
import {
  CheckShoppingItemUseCase,
  GetMenuWeekUseCase,
  GetShoppingListUseCase,
  SwapMenuDishUseCase,
} from './application/use-cases/menu.use-cases';
import { BrioHevyController } from './infrastructure/http/brio-hevy.controller';
import { BrioGarminController } from './infrastructure/http/brio-garmin.controller';
import { AgentsModule } from '../agents/agents.module';
import { BrioAgentTools } from './infrastructure/agents/brio-agent-tools';
import { BrioMcpController } from './infrastructure/mcp/brio-mcp.controller';
import { BrioDigestionController } from './infrastructure/http/brio-digestion.controller';
import { PrismaBrioDigestionRepository } from './infrastructure/persistence/prisma-brio-digestion.repository';
import { BRIO_DIGESTION_REPOSITORY } from './application/ports/digestion.port';
import { TypicalFoodsUseCase } from './application/use-cases/typical-foods.use-case';
import { DigestionUseCases } from './application/use-cases/digestion.use-cases';
import { BrioSocialController } from './infrastructure/http/brio-social.controller';
import { PrismaBrioSocialRepository } from './infrastructure/persistence/prisma-brio-social.repository';
import { BRIO_SOCIAL_REPOSITORY } from './application/ports/social.port';
import {
  SocialChallengesUseCase,
  SocialContext,
  SocialFeedUseCase,
  SocialPeopleUseCase,
  SocialProfileUseCase,
} from './application/use-cases/social.use-cases';
import { BrioConnectionsController } from './infrastructure/http/brio-connections.controller';
import { PrismaConnectionPrefsRepository } from './infrastructure/persistence/prisma-connection-prefs.repository';
import { BRIO_CONNECTION_PREFS } from './application/ports/connection-prefs.port';
import { BrioRecoveryController } from './infrastructure/http/brio-recovery.controller';
import {
  ApplyRecoveryOptionUseCase,
  GetRecoveryUseCase,
} from './application/use-cases/recovery.use-cases';
import { PrismaBrioGarminRepository } from './infrastructure/persistence/prisma-brio-garmin.repository';
import { HttpGarminClient } from './infrastructure/garmin/http-garmin.client';
import {
  GARMIN_CLIENT,
  BRIO_GARMIN_REPOSITORY,
} from './application/ports/garmin.port';
import {
  ConnectGarminUseCase,
  DisconnectGarminUseCase,
  GetGarminStatusUseCase,
  GetRecentHealthUseCase,
  SyncGarminUseCase,
} from './application/use-cases/garmin.use-cases';
import { PrismaBrioHevyRepository } from './infrastructure/persistence/prisma-brio-hevy.repository';
import { HttpHevyClient } from './infrastructure/hevy/http-hevy.client';
import {
  HEVY_CLIENT,
  BRIO_HEVY_REPOSITORY,
  BRIO_SECRET_CIPHER,
} from './application/ports/hevy.port';
import {
  ConnectHevyUseCase,
  DisconnectHevyUseCase,
  GetHevyStatusUseCase,
  SendPlannedRoutineToHevyUseCase,
  SyncHevyUseCase,
  ImportHevyCsvUseCase,
} from './application/use-cases/hevy.use-cases';
import { AesSecretCipher } from '../notifications/infrastructure/crypto/aes-secret-cipher';
import { NullSecretCipher } from '../notifications/infrastructure/crypto/null-secret-cipher';
import { BrioProfileController } from './infrastructure/http/brio-profile.controller';

// Brío — actividad física y calorías (proyecto de la rama `brio-dev`).
//
// Importa IamModule por los guards de `@Auth()`/`@CurrentUser()`: todos los
// endpoints están scopeados al usuario autenticado, no hay administración de
// datos de otros usuarios desde aquí.
@Module({
  imports: [IamModule, AgentsModule],
  controllers: [
    // Conector MCP (TASK-192): las herramientas del coach para IAs externas, con OAuth de IamModule.
    BrioMcpController,
    BrioProfileController,
    BrioActivityController,
    BrioNutritionController,
    BrioRecipesController,
    BrioDiaryController,
    BrioAccountController,
    BrioPerformanceInputsController,
    BrioPerformanceController,
    BrioPlanController,
    BrioMenuController,
    BrioHevyController,
    BrioGarminController,
    BrioHealthDeviceController,
    BrioRoutineController,
    AdminBrioFoodsController,
    AdminBrioExercisesController,
    AdminBrioActivityTypesController,
    BrioSocialController,
    BrioDigestionController,
    BrioConnectionsController,
    BrioRecoveryController,
  ],
  providers: [
    {
      provide: BRIO_PROFILE_REPOSITORY,
      useClass: PrismaBrioProfileRepository,
    },
    { provide: BRIO_BODY_REPOSITORY, useClass: PrismaBrioBodyRepository },
    {
      provide: BRIO_ACTIVITY_REPOSITORY,
      useClass: PrismaBrioActivityRepository,
    },
    { provide: BRIO_FOOD_REPOSITORY, useClass: PrismaBrioFoodRepository },
    { provide: BRIO_DIARY_REPOSITORY, useClass: PrismaBrioDiaryRepository },
    { provide: BRIO_PLAN_REPOSITORY, useClass: PrismaBrioPlanRepository },
    { provide: BRIO_MENU_REPOSITORY, useClass: PrismaBrioMenuRepository },
    { provide: BRIO_HEVY_REPOSITORY, useClass: PrismaBrioHevyRepository },
    { provide: HEVY_CLIENT, useClass: HttpHevyClient },
    { provide: BRIO_GARMIN_REPOSITORY, useClass: PrismaBrioGarminRepository },
    { provide: BRIO_ROUTINE_REPOSITORY, useClass: PrismaBrioRoutineRepository },
    { provide: BRIO_CATALOG_ADMIN, useClass: PrismaBrioCatalogAdminRepository },
    CatalogAdminUseCases,
    { provide: OPEN_FOOD_FACTS, useClass: HttpOpenFoodFactsClient },
    {
      provide: BRIO_DEVICE_HEALTH_REPOSITORY,
      useClass: PrismaBrioDeviceHealthRepository,
    },
    { provide: GARMIN_CLIENT, useClass: HttpGarminClient },
    { provide: BRIO_SOCIAL_REPOSITORY, useClass: PrismaBrioSocialRepository },
    {
      provide: BRIO_DIGESTION_REPOSITORY,
      useClass: PrismaBrioDigestionRepository,
    },
    {
      provide: BRIO_CONNECTION_PREFS,
      useClass: PrismaConnectionPrefsRepository,
    },
    {
      // Cifrado de las claves de terceros (Hevy, Garmin). Usa `BRIO_ENC_KEY` o, si no
      // está, la de notificaciones. Sin ninguna (dev/CI) no cifra, y avisa.
      provide: BRIO_SECRET_CIPHER,
      useFactory: (config: ConfigService) => {
        const key =
          config.get<string>('BRIO_ENC_KEY') ??
          config.get<string>('NOTIFICATIONS_ENC_KEY');
        if (key) return new AesSecretCipher(key);
        new Logger('BrioModule').warn(
          'BRIO_ENC_KEY no definida — las claves de Hevy y Garmin NO se cifran en BBDD.',
        );
        return new NullSecretCipher();
      },
      inject: [ConfigService],
    },
    {
      provide: BRIO_PERFORMANCE_REPOSITORY,
      useClass: PrismaBrioPerformanceRepository,
    },
    {
      provide: BRIO_ACCOUNT_REPOSITORY,
      useClass: PrismaBrioAccountRepository,
    },

    // Compartido por todas las escrituras del diario: mantiene
    // `brio_daily_log` en sync con sus partes.
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
    CreateRecipeUseCase,
    ListRecipesUseCase,
    LogMealEntryUseCase,
    UpdateMealEntryUseCase,
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
    WeekTemplateUseCase,
    // Menús y lista de la compra.
    GetMenuWeekUseCase,
    SwapMenuDishUseCase,
    GetShoppingListUseCase,
    CheckShoppingItemUseCase,
    // Hevy.
    GetHevyStatusUseCase,
    SyncHevyUseCase,
    ImportHevyCsvUseCase,
    ConnectHevyUseCase,
    DisconnectHevyUseCase,
    SendPlannedRoutineToHevyUseCase,
    // Garmin y salud diaria.
    GetGarminStatusUseCase,
    SyncGarminUseCase,
    GetHealthDeviceStatusUseCase,
    ImportDeviceHealthUseCase,
    DisconnectHealthDeviceUseCase,
    ListRoutinesUseCase,
    GetRoutineUseCase,
    SaveRoutineUseCase,
    ArchiveRoutineUseCase,
    LinkSessionToRoutineUseCase,
    SendRoutineToHevyUseCase,
    SyncRoutineWithGarminUseCase,
    GetPreviousSetsUseCase,
    ListRoutineTemplatesUseCase,
    CreateRoutineFromTemplateUseCase,
    ConnectGarminUseCase,
    DisconnectGarminUseCase,
    GetRecentHealthUseCase,
    TypicalFoodsUseCase,
    // Herramientas para los agentes de IA.
    BrioAgentTools,
    // Digestión.
    DigestionUseCases,
    // Social.
    SocialContext,
    SocialProfileUseCase,
    SocialPeopleUseCase,
    SocialFeedUseCase,
    SocialChallengesUseCase,
    // Recuperación.
    GetRecoveryUseCase,
    ApplyRecoveryOptionUseCase,
  ],
})
export class BrioModule {}
