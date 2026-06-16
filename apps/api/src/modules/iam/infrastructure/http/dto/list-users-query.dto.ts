import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CursorPaginationQueryDto } from '../../../../../shared/pagination';
import { type UserType } from '../../../domain/entities/user.entity';

const USER_TYPES: UserType[] = ['BACKOFFICE', 'APP'];

export class ListUsersQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: USER_TYPES })
  @IsOptional()
  @IsIn(USER_TYPES)
  userType?: UserType;

  @ApiPropertyOptional({ description: 'Filtra por activos/inactivos.' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Subcadena dentro del email.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailContains?: string;
}
