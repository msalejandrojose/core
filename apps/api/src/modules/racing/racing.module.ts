import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CAR_ARCHETYPE_REPOSITORY } from './application/ports/car-archetype-repository.port';
import { CAR_PART_REPOSITORY } from './application/ports/car-part-repository.port';
import { LAP_TIME_REPOSITORY } from './application/ports/lap-time-repository.port';
import { PLAYER_CAR_LOADOUT_REPOSITORY } from './application/ports/player-car-loadout-repository.port';
import { RACING_TERRAIN_EFFECT_REPOSITORY } from './application/ports/racing-terrain-effect-repository.port';
import { TRACK_REPOSITORY } from './application/ports/track-repository.port';
import { AdminCreateCarArchetypeUseCase } from './application/use-cases/admin-create-car-archetype.use-case';
import { AdminCreateCarPartUseCase } from './application/use-cases/admin-create-car-part.use-case';
import { AdminCreateTrackUseCase } from './application/use-cases/admin-create-track.use-case';
import { AdminGetCarArchetypeUseCase } from './application/use-cases/admin-get-car-archetype.use-case';
import { AdminGetCarPartUseCase } from './application/use-cases/admin-get-car-part.use-case';
import { AdminGetTrackUseCase } from './application/use-cases/admin-get-track.use-case';
import { AdminListCarArchetypesUseCase } from './application/use-cases/admin-list-car-archetypes.use-case';
import { AdminListLapTimesUseCase } from './application/use-cases/admin-list-lap-times.use-case';
import { AdminListCarPartsUseCase } from './application/use-cases/admin-list-car-parts.use-case';
import { AdminListTracksUseCase } from './application/use-cases/admin-list-tracks.use-case';
import { AdminUpdateCarArchetypeUseCase } from './application/use-cases/admin-update-car-archetype.use-case';
import { AdminUpdateCarPartUseCase } from './application/use-cases/admin-update-car-part.use-case';
import { AdminUpdateTerrainEffectUseCase } from './application/use-cases/admin-update-terrain-effect.use-case';
import { AdminUpdateTrackUseCase } from './application/use-cases/admin-update-track.use-case';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { GetPersonalBestUseCase } from './application/use-cases/get-personal-best.use-case';
import { GetPlayerCarLoadoutUseCase } from './application/use-cases/get-player-car-loadout.use-case';
import { InvalidateLapTimeUseCase } from './application/use-cases/invalidate-lap-time.use-case';
import { ListCarCatalogUseCase } from './application/use-cases/list-car-catalog.use-case';
import { ListTerrainEffectsUseCase } from './application/use-cases/list-terrain-effects.use-case';
import { ListTracksUseCase } from './application/use-cases/list-tracks.use-case';
import { SetPlayerCarLoadoutUseCase } from './application/use-cases/set-player-car-loadout.use-case';
import { SubmitLapTimeUseCase } from './application/use-cases/submit-lap-time.use-case';
import { AdminCarArchetypesController } from './infrastructure/http/admin-car-archetypes.controller';
import { AdminCarPartsController } from './infrastructure/http/admin-car-parts.controller';
import { AdminLapTimesController } from './infrastructure/http/admin-lap-times.controller';
import { AdminTerrainEffectsController } from './infrastructure/http/admin-terrain-effects.controller';
import { AdminTracksController } from './infrastructure/http/admin-tracks.controller';
import { CarLoadoutController } from './infrastructure/http/car-loadout.controller';
import { RacingController } from './infrastructure/http/racing.controller';
import { TerrainEffectsController } from './infrastructure/http/terrain-effects.controller';
import { PrismaCarArchetypeRepository } from './infrastructure/persistence/prisma-car-archetype.repository';
import { PrismaCarPartRepository } from './infrastructure/persistence/prisma-car-part.repository';
import { PrismaLapTimeRepository } from './infrastructure/persistence/prisma-lap-time.repository';
import { PrismaPlayerCarLoadoutRepository } from './infrastructure/persistence/prisma-player-car-loadout.repository';
import { PrismaRacingTerrainEffectRepository } from './infrastructure/persistence/prisma-racing-terrain-effect.repository';
import { PrismaTrackRepository } from './infrastructure/persistence/prisma-track.repository';

@Module({
  // IamModule exporta JwtAuthGuard/PermissionGuard (usados por
  // @RequiresPermission en los controllers admin) — mismo patrón que BlogModule.
  imports: [IamModule],
  controllers: [
    RacingController,
    AdminTracksController,
    AdminLapTimesController,
    CarLoadoutController,
    AdminCarArchetypesController,
    AdminCarPartsController,
    TerrainEffectsController,
    AdminTerrainEffectsController,
  ],
  providers: [
    ListTracksUseCase,
    SubmitLapTimeUseCase,
    GetLeaderboardUseCase,
    GetPersonalBestUseCase,
    AdminListTracksUseCase,
    AdminGetTrackUseCase,
    AdminCreateTrackUseCase,
    AdminUpdateTrackUseCase,
    InvalidateLapTimeUseCase,
    AdminListLapTimesUseCase,
    ListCarCatalogUseCase,
    GetPlayerCarLoadoutUseCase,
    SetPlayerCarLoadoutUseCase,
    AdminListCarArchetypesUseCase,
    AdminGetCarArchetypeUseCase,
    AdminCreateCarArchetypeUseCase,
    AdminUpdateCarArchetypeUseCase,
    AdminListCarPartsUseCase,
    AdminGetCarPartUseCase,
    AdminCreateCarPartUseCase,
    AdminUpdateCarPartUseCase,
    ListTerrainEffectsUseCase,
    AdminUpdateTerrainEffectUseCase,
    { provide: TRACK_REPOSITORY, useClass: PrismaTrackRepository },
    { provide: LAP_TIME_REPOSITORY, useClass: PrismaLapTimeRepository },
    {
      provide: CAR_ARCHETYPE_REPOSITORY,
      useClass: PrismaCarArchetypeRepository,
    },
    { provide: CAR_PART_REPOSITORY, useClass: PrismaCarPartRepository },
    {
      provide: PLAYER_CAR_LOADOUT_REPOSITORY,
      useClass: PrismaPlayerCarLoadoutRepository,
    },
    {
      provide: RACING_TERRAIN_EFFECT_REPOSITORY,
      useClass: PrismaRacingTerrainEffectRepository,
    },
  ],
})
export class RacingModule {}
