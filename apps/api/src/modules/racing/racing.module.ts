import { Module } from '@nestjs/common';
import { LAP_TIME_REPOSITORY } from './application/ports/lap-time-repository.port';
import { TRACK_REPOSITORY } from './application/ports/track-repository.port';
import { GetLeaderboardUseCase } from './application/use-cases/get-leaderboard.use-case';
import { GetPersonalBestUseCase } from './application/use-cases/get-personal-best.use-case';
import { ListTracksUseCase } from './application/use-cases/list-tracks.use-case';
import { SubmitLapTimeUseCase } from './application/use-cases/submit-lap-time.use-case';
import { RacingController } from './infrastructure/http/racing.controller';
import { PrismaLapTimeRepository } from './infrastructure/persistence/prisma-lap-time.repository';
import { PrismaTrackRepository } from './infrastructure/persistence/prisma-track.repository';

@Module({
  controllers: [RacingController],
  providers: [
    ListTracksUseCase,
    SubmitLapTimeUseCase,
    GetLeaderboardUseCase,
    GetPersonalBestUseCase,
    { provide: TRACK_REPOSITORY, useClass: PrismaTrackRepository },
    { provide: LAP_TIME_REPOSITORY, useClass: PrismaLapTimeRepository },
  ],
})
export class RacingModule {}
