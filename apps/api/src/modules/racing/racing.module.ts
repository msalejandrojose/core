import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { StorageModule } from '../storage/storage.module';
import { CAR_ARCHETYPE_REPOSITORY } from './application/ports/car-archetype-repository.port';
import { CAR_PART_REPOSITORY } from './application/ports/car-part-repository.port';
import { CAR_SKIN_REPOSITORY } from './application/ports/car-skin-repository.port';
import { FRIEND_CODE_REPOSITORY } from './application/ports/friend-code-repository.port';
import { FRIENDSHIP_REPOSITORY } from './application/ports/friendship-repository.port';
import { GRAND_PRIX_ATTEMPT_REPOSITORY } from './application/ports/grand-prix-attempt-repository.port';
import { GRAND_PRIX_REPOSITORY } from './application/ports/grand-prix-repository.port';
import { LAP_TIME_REPOSITORY } from './application/ports/lap-time-repository.port';
import { ONLINE_RACE_REPOSITORY } from './application/ports/online-race-repository.port';
import { PLAYER_CAR_LOADOUT_REPOSITORY } from './application/ports/player-car-loadout-repository.port';
import { PLAYER_CAR_SKIN_REPOSITORY } from './application/ports/player-car-skin-repository.port';
import { RACING_TERRAIN_EFFECT_REPOSITORY } from './application/ports/racing-terrain-effect-repository.port';
import { TRACK_REPOSITORY } from './application/ports/track-repository.port';
import { AdminCreateCarArchetypeUseCase } from './application/use-cases/admin-create-car-archetype.use-case';
import { AdminCreateCarPartUseCase } from './application/use-cases/admin-create-car-part.use-case';
import { AdminCreateCarSkinUseCase } from './application/use-cases/admin-create-car-skin.use-case';
import { AdminCreateGrandPrixUseCase } from './application/use-cases/admin-create-grand-prix.use-case';
import { AdminCreateTrackUseCase } from './application/use-cases/admin-create-track.use-case';
import { AdminGetCarArchetypeUseCase } from './application/use-cases/admin-get-car-archetype.use-case';
import { AdminGetCarPartUseCase } from './application/use-cases/admin-get-car-part.use-case';
import { AdminGetCarSkinUseCase } from './application/use-cases/admin-get-car-skin.use-case';
import { AdminGetGrandPrixUseCase } from './application/use-cases/admin-get-grand-prix.use-case';
import { AdminGetTrackUseCase } from './application/use-cases/admin-get-track.use-case';
import { AdminGetUserRacingSummaryUseCase } from './application/use-cases/admin-get-user-racing-summary.use-case';
import { AdminGrantCarSkinUseCase } from './application/use-cases/admin-grant-car-skin.use-case';
import { AdminListCarArchetypesUseCase } from './application/use-cases/admin-list-car-archetypes.use-case';
import { AdminListGrandPrixUseCase } from './application/use-cases/admin-list-grand-prix.use-case';
import { AdminListLapTimesUseCase } from './application/use-cases/admin-list-lap-times.use-case';
import { AdminListCarPartsUseCase } from './application/use-cases/admin-list-car-parts.use-case';
import { AdminListCarSkinsUseCase } from './application/use-cases/admin-list-car-skins.use-case';
import { AdminListTracksUseCase } from './application/use-cases/admin-list-tracks.use-case';
import { AdminUpdateCarArchetypeUseCase } from './application/use-cases/admin-update-car-archetype.use-case';
import { AdminUpdateCarPartUseCase } from './application/use-cases/admin-update-car-part.use-case';
import { AdminUpdateCarSkinUseCase } from './application/use-cases/admin-update-car-skin.use-case';
import { AdminUpdateGrandPrixUseCase } from './application/use-cases/admin-update-grand-prix.use-case';
import { AdminUpdateTerrainEffectUseCase } from './application/use-cases/admin-update-terrain-effect.use-case';
import { AdminUpdateTrackUseCase } from './application/use-cases/admin-update-track.use-case';
import { GetGrandPrixLeaderboardUseCase } from './application/use-cases/get-grand-prix-leaderboard.use-case';
import { GetGrandPrixUseCase } from './application/use-cases/get-grand-prix.use-case';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { GetMyFriendCodeUseCase } from './application/use-cases/get-my-friend-code.use-case';
import { GetOnlineRaceUseCase } from './application/use-cases/get-online-race.use-case';
import { GetPersonalBestUseCase } from './application/use-cases/get-personal-best.use-case';
import { GetGhostUseCase } from './application/use-cases/get-ghost.use-case';
import { GetPlayerCarLoadoutUseCase } from './application/use-cases/get-player-car-loadout.use-case';
import { GetTrackUseCase } from './application/use-cases/get-track.use-case';
import { InvalidateLapTimeUseCase } from './application/use-cases/invalidate-lap-time.use-case';
import { ListCarCatalogUseCase } from './application/use-cases/list-car-catalog.use-case';
import { ListFriendsUseCase } from './application/use-cases/list-friends.use-case';
import { ListGrandPrixUseCase } from './application/use-cases/list-grand-prix.use-case';
import { ListPendingFriendRequestsUseCase } from './application/use-cases/list-pending-friend-requests.use-case';
import { ListTerrainEffectsUseCase } from './application/use-cases/list-terrain-effects.use-case';
import { ListTracksUseCase } from './application/use-cases/list-tracks.use-case';
import { MatchOnlineRaceUseCase } from './application/use-cases/match-online-race.use-case';
import { RequestFriendshipUseCase } from './application/use-cases/request-friendship.use-case';
import { RespondFriendshipUseCase } from './application/use-cases/respond-friendship.use-case';
import { SetPlayerCarLoadoutUseCase } from './application/use-cases/set-player-car-loadout.use-case';
import { StartOrResumeGrandPrixAttemptUseCase } from './application/use-cases/start-or-resume-grand-prix-attempt.use-case';
import { SubmitGrandPrixStageResultUseCase } from './application/use-cases/submit-grand-prix-stage-result.use-case';
import { SubmitLapTimeUseCase } from './application/use-cases/submit-lap-time.use-case';
import { SubmitOnlineRaceResultUseCase } from './application/use-cases/submit-online-race-result.use-case';
import { AdminCarArchetypesController } from './infrastructure/http/admin-car-archetypes.controller';
import { AdminCarPartsController } from './infrastructure/http/admin-car-parts.controller';
import { AdminCarSkinsController } from './infrastructure/http/admin-car-skins.controller';
import { AdminGrandPrixController } from './infrastructure/http/admin-grand-prix.controller';
import { AdminLapTimesController } from './infrastructure/http/admin-lap-times.controller';
import { AdminRacingUsersController } from './infrastructure/http/admin-racing-users.controller';
import { AdminTerrainEffectsController } from './infrastructure/http/admin-terrain-effects.controller';
import { AdminTracksController } from './infrastructure/http/admin-tracks.controller';
import { CarLoadoutController } from './infrastructure/http/car-loadout.controller';
import { FriendsController } from './infrastructure/http/friends.controller';
import { GrandPrixController } from './infrastructure/http/grand-prix.controller';
import { RacingController } from './infrastructure/http/racing.controller';
import { TerrainEffectsController } from './infrastructure/http/terrain-effects.controller';
import { PrismaCarArchetypeRepository } from './infrastructure/persistence/prisma-car-archetype.repository';
import { PrismaCarPartRepository } from './infrastructure/persistence/prisma-car-part.repository';
import { PrismaCarSkinRepository } from './infrastructure/persistence/prisma-car-skin.repository';
import { PrismaFriendCodeRepository } from './infrastructure/persistence/prisma-friend-code.repository';
import { PrismaFriendshipRepository } from './infrastructure/persistence/prisma-friendship.repository';
import { PrismaGrandPrixAttemptRepository } from './infrastructure/persistence/prisma-grand-prix-attempt.repository';
import { PrismaGrandPrixRepository } from './infrastructure/persistence/prisma-grand-prix.repository';
import { PrismaLapTimeRepository } from './infrastructure/persistence/prisma-lap-time.repository';
import { PrismaOnlineRaceRepository } from './infrastructure/persistence/prisma-online-race.repository';
import { PrismaPlayerCarLoadoutRepository } from './infrastructure/persistence/prisma-player-car-loadout.repository';
import { PrismaPlayerCarSkinRepository } from './infrastructure/persistence/prisma-player-car-skin.repository';
import { PrismaRacingTerrainEffectRepository } from './infrastructure/persistence/prisma-racing-terrain-effect.repository';
import { PrismaTrackRepository } from './infrastructure/persistence/prisma-track.repository';

@Module({
  // IamModule exporta JwtAuthGuard/PermissionGuard (usados por
  // @RequiresPermission en los controllers admin) — mismo patrón que BlogModule.
  // StorageModule exporta FileViewTokenService: hace falta para resolver
  // `Track.imageId` a una URL de visualización pública en las respuestas.
  imports: [IamModule, StorageModule],
  controllers: [
    RacingController,
    AdminTracksController,
    AdminLapTimesController,
    CarLoadoutController,
    AdminCarArchetypesController,
    AdminCarPartsController,
    AdminCarSkinsController,
    TerrainEffectsController,
    AdminTerrainEffectsController,
    AdminRacingUsersController,
    GrandPrixController,
    AdminGrandPrixController,
    FriendsController,
  ],
  providers: [
    ListTracksUseCase,
    SubmitLapTimeUseCase,
    GetLeaderboardUseCase,
    GetPersonalBestUseCase,
    GetTrackUseCase,
    GetGhostUseCase,
    SubmitOnlineRaceResultUseCase,
    GetOnlineRaceUseCase,
    MatchOnlineRaceUseCase,
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
    AdminListCarSkinsUseCase,
    AdminGetCarSkinUseCase,
    AdminCreateCarSkinUseCase,
    AdminUpdateCarSkinUseCase,
    AdminGrantCarSkinUseCase,
    ListTerrainEffectsUseCase,
    AdminUpdateTerrainEffectUseCase,
    AdminGetUserRacingSummaryUseCase,
    ListGrandPrixUseCase,
    GetGrandPrixUseCase,
    StartOrResumeGrandPrixAttemptUseCase,
    SubmitGrandPrixStageResultUseCase,
    GetGrandPrixLeaderboardUseCase,
    AdminListGrandPrixUseCase,
    AdminGetGrandPrixUseCase,
    AdminCreateGrandPrixUseCase,
    AdminUpdateGrandPrixUseCase,
    GetMyFriendCodeUseCase,
    RequestFriendshipUseCase,
    RespondFriendshipUseCase,
    ListFriendsUseCase,
    ListPendingFriendRequestsUseCase,
    { provide: TRACK_REPOSITORY, useClass: PrismaTrackRepository },
    { provide: LAP_TIME_REPOSITORY, useClass: PrismaLapTimeRepository },
    { provide: ONLINE_RACE_REPOSITORY, useClass: PrismaOnlineRaceRepository },
    { provide: FRIEND_CODE_REPOSITORY, useClass: PrismaFriendCodeRepository },
    { provide: FRIENDSHIP_REPOSITORY, useClass: PrismaFriendshipRepository },
    {
      provide: CAR_ARCHETYPE_REPOSITORY,
      useClass: PrismaCarArchetypeRepository,
    },
    { provide: CAR_PART_REPOSITORY, useClass: PrismaCarPartRepository },
    { provide: CAR_SKIN_REPOSITORY, useClass: PrismaCarSkinRepository },
    {
      provide: PLAYER_CAR_LOADOUT_REPOSITORY,
      useClass: PrismaPlayerCarLoadoutRepository,
    },
    {
      provide: PLAYER_CAR_SKIN_REPOSITORY,
      useClass: PrismaPlayerCarSkinRepository,
    },
    {
      provide: RACING_TERRAIN_EFFECT_REPOSITORY,
      useClass: PrismaRacingTerrainEffectRepository,
    },
    { provide: GRAND_PRIX_REPOSITORY, useClass: PrismaGrandPrixRepository },
    {
      provide: GRAND_PRIX_ATTEMPT_REPOSITORY,
      useClass: PrismaGrandPrixAttemptRepository,
    },
  ],
})
export class RacingModule {}
