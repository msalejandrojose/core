import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { NUTRE_ACTIVITY_REPOSITORY } from './application/ports/nutre-activity-repository.port';
import { NUTRE_BODY_REPOSITORY } from './application/ports/nutre-body-repository.port';
import { NUTRE_DIARY_REPOSITORY } from './application/ports/nutre-diary-repository.port';
import { NUTRE_FOOD_REPOSITORY } from './application/ports/nutre-food-repository.port';
import { NUTRE_PROFILE_REPOSITORY } from './application/ports/nutre-profile-repository.port';
import { CreateFoodUseCase } from './application/use-cases/create-food.use-case';
import { DeleteActivitySessionUseCase } from './application/use-cases/delete-activity-session.use-case';
import { DeleteMealEntryUseCase } from './application/use-cases/delete-meal-entry.use-case';
import { GetDaySummaryUseCase } from './application/use-cases/get-day-summary.use-case';
import { GetMyProfileUseCase } from './application/use-cases/get-my-profile.use-case';
import { GetProgressUseCase } from './application/use-cases/get-progress.use-case';
import { ListActivityTypesUseCase } from './application/use-cases/list-activity-types.use-case';
import { LogActivitySessionUseCase } from './application/use-cases/log-activity-session.use-case';
import { LogMealEntryUseCase } from './application/use-cases/log-meal-entry.use-case';
import { LogWeightUseCase } from './application/use-cases/log-weight.use-case';
import { RefreshDailyLogUseCase } from './application/use-cases/refresh-daily-log.use-case';
import { SaveMyProfileUseCase } from './application/use-cases/save-my-profile.use-case';
import { SearchFoodsUseCase } from './application/use-cases/search-foods.use-case';
import { PrismaNutreActivityRepository } from './infrastructure/persistence/prisma-nutre-activity.repository';
import { PrismaNutreBodyRepository } from './infrastructure/persistence/prisma-nutre-body.repository';
import { PrismaNutreDiaryRepository } from './infrastructure/persistence/prisma-nutre-diary.repository';
import { PrismaNutreFoodRepository } from './infrastructure/persistence/prisma-nutre-food.repository';
import { PrismaNutreProfileRepository } from './infrastructure/persistence/prisma-nutre-profile.repository';
import { NutreActivityController } from './infrastructure/http/nutre-activity.controller';
import { NutreDiaryController } from './infrastructure/http/nutre-diary.controller';
import { NutreNutritionController } from './infrastructure/http/nutre-nutrition.controller';
import { NutreProfileController } from './infrastructure/http/nutre-profile.controller';

// Nutre — actividad física y calorías (proyecto de la rama `nutre-dev`).
//
// Importa IamModule por los guards de `@Auth()`/`@CurrentUser()`: todos los
// endpoints están scopeados al usuario autenticado, no hay administración de
// datos de otros usuarios desde aquí.
@Module({
  imports: [IamModule],
  controllers: [
    NutreProfileController,
    NutreActivityController,
    NutreNutritionController,
    NutreDiaryController,
  ],
  providers: [
    { provide: NUTRE_PROFILE_REPOSITORY, useClass: PrismaNutreProfileRepository },
    { provide: NUTRE_BODY_REPOSITORY, useClass: PrismaNutreBodyRepository },
    { provide: NUTRE_ACTIVITY_REPOSITORY, useClass: PrismaNutreActivityRepository },
    { provide: NUTRE_FOOD_REPOSITORY, useClass: PrismaNutreFoodRepository },
    { provide: NUTRE_DIARY_REPOSITORY, useClass: PrismaNutreDiaryRepository },

    // Compartido por todas las escrituras del diario: mantiene
    // `nutre_daily_log` en sync con sus partes.
    RefreshDailyLogUseCase,

    GetMyProfileUseCase,
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
  ],
})
export class NutreModule {}
