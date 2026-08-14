import { ApiProperty } from '@nestjs/swagger';
import { GhostResult } from '../../../application/use-cases/get-ghost.use-case';
import { GhostSnapshotDto } from './ghost-snapshot.dto';

export class GhostResponseDto {
  @ApiProperty({ example: 42350 })
  durationMs!: number;

  @ApiProperty({ type: [GhostSnapshotDto] })
  snapshots!: GhostSnapshotDto[];

  static fromResult(result: GhostResult): GhostResponseDto {
    const dto = new GhostResponseDto();
    dto.durationMs = result.durationMs;
    dto.snapshots = result.snapshots;
    return dto;
  }
}
