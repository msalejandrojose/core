import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { type FormResponsePolicy } from '../../../domain/entities/form-instance.entity';

const RESPONSE_POLICIES: FormResponsePolicy[] = ['SINGLE_PER_LINK', 'SINGLE_PER_USER', 'UNLIMITED'];

export class CreateFormInstanceDto {
  @ApiPropertyOptional({ enum: RESPONSE_POLICIES, default: 'UNLIMITED' })
  @IsOptional()
  @IsIn(RESPONSE_POLICIES)
  responsePolicy?: FormResponsePolicy;

  @ApiPropertyOptional({ default: false })
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
}
