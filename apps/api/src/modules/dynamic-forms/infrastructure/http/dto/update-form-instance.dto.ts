import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { type FormInstanceStatus, type FormResponsePolicy } from '../../../domain/entities/form-instance.entity';

const RESPONSE_POLICIES: FormResponsePolicy[] = ['SINGLE_PER_LINK', 'SINGLE_PER_USER', 'UNLIMITED'];
const INSTANCE_STATUSES: FormInstanceStatus[] = ['ACTIVE', 'CLOSED'];

export class UpdateFormInstanceDto {
  @ApiPropertyOptional({ enum: RESPONSE_POLICIES })
  @IsOptional()
  @IsIn(RESPONSE_POLICIES)
  responsePolicy?: FormResponsePolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresAuth?: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  opensAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  closesAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxResponses?: number | null;

  @ApiPropertyOptional({ enum: INSTANCE_STATUSES })
  @IsOptional()
  @IsIn(INSTANCE_STATUSES)
  status?: FormInstanceStatus;
}
