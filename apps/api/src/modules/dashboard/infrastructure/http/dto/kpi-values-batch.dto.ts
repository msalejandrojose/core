import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMaxSize } from 'class-validator';

export class KpiValuesBatchRequestDto {
  @ApiProperty({ type: [String], example: ['users.total', 'roles.total'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  slugs!: string[];
}

export class KpiValueItemDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty({ nullable: true })
  value!: number | null;

  @ApiProperty({ description: 'Error message if the KPI could not be evaluated.' })
  error?: string;
}

export class KpiValuesBatchResponseDto {
  @ApiProperty({ type: [KpiValueItemDto] })
  values!: KpiValueItemDto[];
}
