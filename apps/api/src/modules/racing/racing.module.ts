import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { IamModule } from '../iam/iam.module';
import { StorageModule } from '../storage/storage.module';
import { CAR_ARCHETYPE_REPOSITORY } from './application/ports/car-archetype-repository.port';
import { CAR_PART_REPOSITORY } from './application/ports/car-part-repository.port';
import { CAR_SHOP_REPOSITORY } from './application/ports/car-shop-repository.port';
import { CAR_SKIN_REPOSITORY } from './application/ports/car-skin-repository.port';
import { FRIEND_CODE_REPOSITORY } from './application/ports/friend-code-repository.port';
import { FRIENDSHIP_REPOSITORY } from './application/ports/friendship-repository.port';
import { GRAND_PRIX_ATTEMPT_REPOSITORY } from './application/ports/grand-prix-attempt-repository.port';
import { GRAND_PRIX_REPOSITORY } from './application/ports/grand-prix-repository.port';
import { LAP_TIME_REPOSITORY } from './application/ports/lap-time-repository.port';
import { LIVE_RACE_REPOSITORY } from './application/ports/live-race-repository.port';
import { ONLINE_RACE_REPOSITORY } from './application/ports/online-race-repository.port';
import { PLAYER_CAR_ARCHETYPE_REPOSITORY } from './application/ports/player-car-archetype-repository.port';
import { PLAYER_CAR_LOADOUT_REPOSITORY } from './application/ports/player-car-loadout-repository.port';
import { PLAYER_CAR_PART_REPOSITORY } from './application/ports/player-car-part-repository.port';
import { PLAYER_CAR_SKIN_REPOSITORY } from './application/ports/player-car-skin-repository.port';
import { PLAYER_RATING_REPOSITORY } from './application/ports/player-rating-repository.port';
import { RACING_BOT_REPOSITORY } from './application/ports/racing-bot-repository.port';
import { RACING_CIRCUIT_REPOSITORY } from './application/ports/racing-circuit-repository.port';
import { RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY } from './application/ports/racing-circuit-rotation-config-repository.port';
import { RACING_COIN_REWARD_CONFIG_REPOSITORY } from './application/ports/racing-coin-reward-config-repository.port';
import { RACING_LEAGUE_CONFIG_REPOSITORY } from './application/ports/racing-league-config-repository.port';
import { RACING_LEAGUE_REPOSITORY } from './application/ports/racing-league-repository.port';
import { RACING_MATCHMAKING_CONFIG_REPOSITORY } from './application/ports/racing-matchmaking-config-repository.port';
import { RACING_TERRAIN_EFFECT_REPOSITORY } from './application/ports/racing-terrain-effect-repository.port';
import { RACING_WALLET_REPOSITORY } from './application/ports/racing-wallet-repository.port';
import { SEASON_REPOSITORY } from './application/ports/season-repository.port';
import { TRACK_REPOSITORY } from './application/ports/track-repository.port';
import { LiveRaceRoomManager } from './application/live-race/live-race-room.manager';
import { AdminCreateCarArchetypeUseCase } from './application/use-cases/admin-create-car-archetype.use-case';
import { AdminCreateCarPartUseCase } from './application/use-cases/admin-create-car-part.use-case';
import { AdminCreateCarSkinUseCase } from './application/use-cases/admin-create-car-skin.use-case';
import { AdminCreateGrandPrixUseCase } from './application/use-cases/admin-create-grand-prix.use-case';
import { AdminCreateSeasonUseCase } from './application/use-cases/admin-create-season.use-case';
import { AutoRotateSeasonUseCase } from './application/use-cases/auto-rotate-season.use-case';
import { AdminUpdateCircuitRotationConfigUseCase } from './application/use-cases/admin-update-circuit-rotation-config.use-case';
import { AdminUpdateCoinRewardConfigUseCase } from './application/use-cases/admin-update-coin-reward-config.use-case';
import { AdminUpdateLeagueConfigUseCase } from './application/use-cases/admin-update-league-config.use-case';
import { AdminUpdateMatchmakingConfigUseCase } from './application/use-cases/admin-update-matchmaking-config.use-case';
import { AutoRotateCircuitsUseCase } from './application/use-cases/auto-rotate-circuits.use-case';
import { AwardLeaguePointsUseCase } from './application/use-cases/award-league-points.use-case';
import { CreditRewardedAdUseCase } from './application/use-cases/credit-rewarded-ad.use-case';
import { AdminGetCarArchetypeUseCase } from './application/use-cases/admin-get-car-archetype.use-case';
import { AdminGetCarPartUseCase } from './application/use-cases/admin-get-car-part.use-case';
import { AdminGetCarSkinUseCase } from './application/use-cases/admin-get-car-skin.use-case';
import { AdminGetCircuitUseCase } from './application/use-cases/admin-get-circuit.use-case';
import { AdminGetGrandPrixUseCase } from './application/use-cases/admin-get-grand-prix.use-case';
import { AdminGetTrackUseCase } from './application/use-cases/admin-get-track.use-case';
import { AdminGetUserRacingSummaryUseCase } from './application/use-cases/admin-get-user-racing-summary.use-case';
import { AdminGrantCarSkinUseCase } from './application/use-cases/admin-grant-car-skin.use-case';
import { AdminListCarArchetypesUseCase } from './application/use-cases/admin-list-car-archetypes.use-case';
import { AdminListCircuitsUseCase } from './application/use-cases/admin-list-circuits.use-case';
import { AdminListGrandPrixUseCase } from './application/use-cases/admin-list-grand-prix.use-case';
import { AdminListLapTimesUseCase } from './application/use-cases/admin-list-lap-times.use-case';
import { AdminListCarPartsUseCase } from './application/use-cases/admin-list-car-parts.use-case';
import { AdminListCarSkinsUseCase } from './application/use-cases/admin-list-car-skins.use-case';
import { AdminListSeasonsUseCase } from './application/use-cases/admin-list-seasons.use-case';
import { AdminListTracksUseCase } from './application/use-cases/admin-list-tracks.use-case';
import { AdminUpdateCarArchetypeUseCase } from './application/use-cases/admin-update-car-archetype.use-case';
import { AdminUpdateCarPartUseCase } from './application/use-cases/admin-update-car-part.use-case';
import { AdminUpdateCarSkinUseCase } from './application/use-cases/admin-update-car-skin.use-case';
import { AdminUpdateCircuitUseCase } from './application/use-cases/admin-update-circuit.use-case';
import { AdminUpdateGrandPrixUseCase } from './application/use-cases/admin-update-grand-prix.use-case';
import { AdminUpdateTerrainEffectUseCase } from './application/use-cases/admin-update-terrain-effect.use-case';
import { AdminUpdateTrackUseCase } from './application/use-cases/admin-update-track.use-case';
import { GetCurrentSeasonUseCase } from './application/use-cases/get-current-season.use-case';
import { GetFriendsLeaderboardUseCase } from './application/use-cases/get-friends-leaderboard.use-case';
import { GetGrandPrixLeaderboardUseCase } from './application/use-cases/get-grand-prix-leaderboard.use-case';
import { GetGrandPrixUseCase } from './application/use-cases/get-grand-prix.use-case';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { GetMyFriendCodeUseCase } from './application/use-cases/get-my-friend-code.use-case';
import { GetMyLeagueStandingUseCase } from './application/use-cases/get-my-league-standing.use-case';
import { GetOnlineRaceUseCase } from './application/use-cases/get-online-race.use-case';
import { GetPersonalBestUseCase } from './application/use-cases/get-personal-best.use-case';
import { GetGhostUseCase } from './application/use-cases/get-ghost.use-case';
import { GetPlayerCarLoadoutUseCase } from './application/use-cases/get-player-car-loadout.use-case';
import { GetTrackUseCase } from './application/use-cases/get-track.use-case';
import { GetWalletBalanceUseCase } from './application/use-cases/get-wallet-balance.use-case';
import { InvalidateLapTimeUseCase } from './application/use-cases/invalidate-lap-time.use-case';
import { ListCarCatalogUseCase } from './application/use-cases/list-car-catalog.use-case';
import { ListCircuitRotationConfigsUseCase } from './application/use-cases/list-circuit-rotation-configs.use-case';
import { ListCoinRewardConfigsUseCase } from './application/use-cases/list-coin-reward-configs.use-case';
import { ListLeagueConfigsUseCase } from './application/use-cases/list-league-configs.use-case';
import { ListMatchmakingConfigsUseCase } from './application/use-cases/list-matchmaking-configs.use-case';
import { AdminListPlayerRatingsUseCase } from './application/use-cases/admin-list-player-ratings.use-case';
import { AdminTrackPopularityUseCase } from './application/use-cases/admin-track-popularity.use-case';
import { ListFriendsUseCase } from './application/use-cases/list-friends.use-case';
import { ListGrandPrixUseCase } from './application/use-cases/list-grand-prix.use-case';
import { ListPendingFriendRequestsUseCase } from './application/use-cases/list-pending-friend-requests.use-case';
import { ListTerrainEffectsUseCase } from './application/use-cases/list-terrain-effects.use-case';
import { ListTracksUseCase } from './application/use-cases/list-tracks.use-case';
import { MatchOnlineRaceUseCase } from './application/use-cases/match-online-race.use-case';
import { PurchaseCarItemUseCase } from './application/use-cases/purchase-car-item.use-case';
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
import { AdminCircuitRotationConfigController } from './infrastructure/http/admin-circuit-rotation-config.controller';
import { AdminCircuitsController } from './infrastructure/http/admin-circuits.controller';
import { AdminCoinRewardConfigsController } from './infrastructure/http/admin-coin-reward-configs.controller';
import { AdminLeagueConfigsController } from './infrastructure/http/admin-league-configs.controller';
import { AdminMatchmakingConfigController } from './infrastructure/http/admin-matchmaking-config.controller';
import { AdminPlayerRatingsController } from './infrastructure/http/admin-player-ratings.controller';
import { AdminGrandPrixController } from './infrastructure/http/admin-grand-prix.controller';
import { AdminLapTimesController } from './infrastructure/http/admin-lap-times.controller';
import { AdminRacingUsersController } from './infrastructure/http/admin-racing-users.controller';
import { AdminSeasonsController } from './infrastructure/http/admin-seasons.controller';
import { AdminTerrainEffectsController } from './infrastructure/http/admin-terrain-effects.controller';
import { AdminTrackPopularityController } from './infrastructure/http/admin-track-popularity.controller';
import { AdminTracksController } from './infrastructure/http/admin-tracks.controller';
import { CarLoadoutController } from './infrastructure/http/car-loadout.controller';
import { FriendsController } from './infrastructure/http/friends.controller';
import { GrandPrixController } from './infrastructure/http/grand-prix.controller';
import { RacingController } from './infrastructure/http/racing.controller';
import { TerrainEffectsController } from './infrastructure/http/terrain-effects.controller';
import { LiveRaceGateway } from './infrastructure/realtime/live-race.gateway';
import { PrismaCarArchetypeRepository } from './infrastructure/persistence/prisma-car-archetype.repository';
import { PrismaCarPartRepository } from './infrastructure/persistence/prisma-car-part.repository';
import { PrismaCarShopRepository } from './infrastructure/persistence/prisma-car-shop.repository';
import { PrismaCarSkinRepository } from './infrastructure/persistence/prisma-car-skin.repository';
import { PrismaFriendCodeRepository } from './infrastructure/persistence/prisma-friend-code.repository';
import { PrismaFriendshipRepository } from './infrastructure/persistence/prisma-friendship.repository';
import { PrismaGrandPrixAttemptRepository } from './infrastructure/persistence/prisma-grand-prix-attempt.repository';
import { PrismaGrandPrixRepository } from './infrastructure/persistence/prisma-grand-prix.repository';
import { PrismaLapTimeRepository } from './infrastructure/persistence/prisma-lap-time.repository';
import { PrismaLiveRaceRepository } from './infrastructure/persistence/prisma-live-race.repository';
import { PrismaOnlineRaceRepository } from './infrastructure/persistence/prisma-online-race.repository';
import { PrismaPlayerCarArchetypeRepository } from './infrastructure/persistence/prisma-player-car-archetype.repository';
import { PrismaPlayerCarLoadoutRepository } from './infrastructure/persistence/prisma-player-car-loadout.repository';
import { PrismaPlayerCarPartRepository } from './infrastructure/persistence/prisma-player-car-part.repository';
import { PrismaPlayerCarSkinRepository } from './infrastructure/persistence/prisma-player-car-skin.repository';
import { PrismaPlayerRatingRepository } from './infrastructure/persistence/prisma-player-rating.repository';
import { PrismaRacingBotRepository } from './infrastructure/persistence/prisma-racing-bot.repository';
import { PrismaRacingCircuitRepository } from './infrastructure/persistence/prisma-racing-circuit.repository';
import { PrismaRacingCircuitRotationConfigRepository } from './infrastructure/persistence/prisma-racing-circuit-rotation-config.repository';
import { PrismaRacingCoinRewardConfigRepository } from './infrastructure/persistence/prisma-racing-coin-reward-config.repository';
import { PrismaRacingLeagueConfigRepository } from './infrastructure/persistence/prisma-racing-league-config.repository';
import { PrismaRacingLeagueRepository } from './infrastructure/persistence/prisma-racing-league.repository';
import { PrismaRacingMatchmakingConfigRepository } from './infrastructure/persistence/prisma-racing-matchmaking-config.repository';
import { PrismaRacingTerrainEffectRepository } from './infrastructure/persistence/prisma-racing-terrain-effect.repository';
import { PrismaRacingWalletRepository } from './infrastructure/persistence/prisma-racing-wallet.repository';
import { PrismaSeasonRepository } from './infrastructure/persistence/prisma-season.repository';
import { PrismaTrackRepository } from './infrastructure/persistence/prisma-track.repository';
import { CircuitRotationService } from './infrastructure/scheduler/circuit-rotation.service';
import { SeasonRotationService } from './infrastructure/scheduler/season-rotation.service';

@Module({
  // IamModule exporta JwtAuthGuard/PermissionGuard (usados por
  // @RequiresPermission en los controllers admin) — mismo patrón que BlogModule.
  // StorageModule exporta FileViewTokenService: hace falta para resolver
  // `Track.imageId` a una URL de visualización pública en las respuestas.
  // JwtModule (mismo JWT_SECRET que la API) autentica las conexiones
  // WebSocket de `LiveRaceGateway` — mismo patrón que `WhatsappModule`.
  imports: [
    IamModule,
    StorageModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
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
    AdminSeasonsController,
    AdminCoinRewardConfigsController,
    AdminMatchmakingConfigController,
    AdminPlayerRatingsController,
    AdminTrackPopularityController,
    AdminLeagueConfigsController,
    AdminCircuitsController,
    AdminCircuitRotationConfigController,
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
    AdminCreateSeasonUseCase,
    AdminListSeasonsUseCase,
    GetCurrentSeasonUseCase,
    AutoRotateSeasonUseCase,
    SeasonRotationService,
    GetFriendsLeaderboardUseCase,
    GetWalletBalanceUseCase,
    CreditRewardedAdUseCase,
    PurchaseCarItemUseCase,
    ListCoinRewardConfigsUseCase,
    AdminUpdateCoinRewardConfigUseCase,
    ListMatchmakingConfigsUseCase,
    AdminListPlayerRatingsUseCase,
    AdminUpdateMatchmakingConfigUseCase,
    AdminTrackPopularityUseCase,
    ListLeagueConfigsUseCase,
    AdminUpdateLeagueConfigUseCase,
    AwardLeaguePointsUseCase,
    GetMyLeagueStandingUseCase,
    AdminListCircuitsUseCase,
    AdminGetCircuitUseCase,
    AdminUpdateCircuitUseCase,
    AutoRotateCircuitsUseCase,
    CircuitRotationService,
    ListCircuitRotationConfigsUseCase,
    AdminUpdateCircuitRotationConfigUseCase,
    LiveRaceRoomManager,
    LiveRaceGateway,
    { provide: TRACK_REPOSITORY, useClass: PrismaTrackRepository },
    { provide: LAP_TIME_REPOSITORY, useClass: PrismaLapTimeRepository },
    { provide: ONLINE_RACE_REPOSITORY, useClass: PrismaOnlineRaceRepository },
    { provide: LIVE_RACE_REPOSITORY, useClass: PrismaLiveRaceRepository },
    { provide: PLAYER_RATING_REPOSITORY, useClass: PrismaPlayerRatingRepository },
    { provide: RACING_BOT_REPOSITORY, useClass: PrismaRacingBotRepository },
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
      provide: PLAYER_CAR_ARCHETYPE_REPOSITORY,
      useClass: PrismaPlayerCarArchetypeRepository,
    },
    {
      provide: PLAYER_CAR_PART_REPOSITORY,
      useClass: PrismaPlayerCarPartRepository,
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
    { provide: SEASON_REPOSITORY, useClass: PrismaSeasonRepository },
    {
      provide: RACING_WALLET_REPOSITORY,
      useClass: PrismaRacingWalletRepository,
    },
    { provide: CAR_SHOP_REPOSITORY, useClass: PrismaCarShopRepository },
    {
      provide: RACING_COIN_REWARD_CONFIG_REPOSITORY,
      useClass: PrismaRacingCoinRewardConfigRepository,
    },
    {
      provide: RACING_MATCHMAKING_CONFIG_REPOSITORY,
      useClass: PrismaRacingMatchmakingConfigRepository,
    },
    {
      provide: RACING_LEAGUE_CONFIG_REPOSITORY,
      useClass: PrismaRacingLeagueConfigRepository,
    },
    { provide: RACING_LEAGUE_REPOSITORY, useClass: PrismaRacingLeagueRepository },
    { provide: RACING_CIRCUIT_REPOSITORY, useClass: PrismaRacingCircuitRepository },
    {
      provide: RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY,
      useClass: PrismaRacingCircuitRotationConfigRepository,
    },
  ],
})
export class RacingModule {}
