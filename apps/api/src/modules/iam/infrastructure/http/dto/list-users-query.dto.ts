import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';
import { type UserType } from '../../../domain/entities/user.entity';

const USER_TYPES: UserType[] = ['BACKOFFICE', 'APP'];

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: USER_TYPES })
  @IsOptional()
  @IsIn(USER_TYPES)
  userType?: UserType;

  @ApiPropertyOptional({ description: 'Filtra por activos/inactivos.' })
  @IsOptional()
  // class-transformer convierte el string ?isActive=true → boolean
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
