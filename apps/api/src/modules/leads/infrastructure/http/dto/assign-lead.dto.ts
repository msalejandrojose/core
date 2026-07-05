import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignLeadDto {
  @ApiProperty() @IsUUID() ownerId: string;
}
