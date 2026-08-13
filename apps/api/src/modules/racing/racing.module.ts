import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { LAP_TIME_REPOSITORY } from './application/ports/lap-time-repository.port';
import { TRACK_REPOSITORY } from './application/ports/track-repository.port';
import { AdminCreateTrackUseCase } from './application/use-cases/admin-create-track.use-case';
import { AdminGetTrackUseCase } from './application/use-cases/admin-get-track.use-case';
import { AdminListTracksUseCase } from './application/use-cases/admin-list-tracks.use-case';
import { AdminUpdateTrackUseCase } from './application/use-cases/admin-update-track.use-case';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { GetPersonalBestUseCase } from './application/use-cases/get-personal-best.use-case';
import { InvalidateLapTimeUseCase } from './application/use-cases/invalidate-lap-time.use-case';
import { ListTracksUseCase } from './application/use-cases/list-tracks.use-case';
import { SubmitLapTimeUseCase } from './application/use-cases/submit-lap-time.use-case';
import { AdminLapTimesController } from './infrastructure/http/admin-lap-times.controller';
import { AdminTracksController } from './infrastructure/http/admin-tracks.controller';
import { RacingController } from './infrastructure/http/racing.controller';
import { PrismaLapTimeRepository } from './infrastructure/persistence/prisma-lap-time.repository';
import { PrismaTrackRepository } from './infrastructure/persistence/prisma-track.repository';

@Module({
  // IamModule exporta JwtAuthGuard/PermissionGuard (usados por
  // @RequiresPermission en los controllers admin) — mismo patrón que BlogModule.
  imports: [IamModule],
  controllers: [
    RacingController,
    AdminTracksController,
    AdminLapTimesController,
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
    { provide: TRACK_REPOSITORY, useClass: PrismaTrackRepository },
    { provide: LAP_TIME_REPOSITORY, useClass: PrismaLapTimeRepository },
  ],
})
export class RacingModule {}
