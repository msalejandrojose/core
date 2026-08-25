import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GrantCarSkinDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  skinId!: string;
}
