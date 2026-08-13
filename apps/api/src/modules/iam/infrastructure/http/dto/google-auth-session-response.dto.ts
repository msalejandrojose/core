import { ApiProperty } from '@nestjs/swagger';
import type { GoogleAuthSessionStatus } from '../../../domain/entities/google-auth-session.entity';
import type { GoogleAuthSessionStatusResult } from '../../../application/use-cases/get-google-auth-session.use-case';
import { UserResponseDto } from './user-response.dto';

export class GoogleAuthSessionResponseDto {
  @ApiProperty({ enum: ['PENDING', 'READY', 'FAILED'] as const })
  status!: GoogleAuthSessionStatus;

  @ApiProperty({ type: String, nullable: true })
  accessToken!: string | null;

  @ApiProperty({ type: UserResponseDto, nullable: true })
  user!: UserResponseDto | null;

  @ApiProperty({ type: String, nullable: true })
  failureReason!: string | null;

  static from(
    result: GoogleAuthSessionStatusResult,
  ): GoogleAuthSessionResponseDto {
    const dto = new GoogleAuthSessionResponseDto();
    dto.status = result.status;
    dto.accessToken = result.accessToken;
    dto.user = result.user ? UserResponseDto.fromUser(result.user) : null;
    dto.failureReason = result.failureReason;
    return dto;
  }
}
