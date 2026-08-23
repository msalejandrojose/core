import { ApiProperty } from '@nestjs/swagger';
import {
  RacingLeagueStanding,
  RacingLeagueTier,
} from '../../../domain/entities/racing-league-standing.entity';

export class LeagueStandingResponseDto {
  @ApiProperty({ enum: RacingLeagueTier }) tier!: RacingLeagueTier;
  @ApiProperty({ example: 120 }) points!: number;

  static fromDomain(standing: RacingLeagueStanding): LeagueStandingResponseDto {
    const dto = new LeagueStandingResponseDto();
    dto.tier = standing.tier;
    dto.points = standing.points;
    return dto;
  }

  /** Sin temporada abierta todavía no hay standing que leer, pero seguir
   *  siendo Bronce/0 en ese caso es la respuesta correcta, no un error. */
  static bronzeDefault(): LeagueStandingResponseDto {
    const dto = new LeagueStandingResponseDto();
    dto.tier = RacingLeagueTier.BRONZE;
    dto.points = 0;
    return dto;
  }
}
