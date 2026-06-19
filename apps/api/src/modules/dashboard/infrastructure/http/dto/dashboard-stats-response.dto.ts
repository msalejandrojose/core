import { ApiProperty } from '@nestjs/swagger';
import { type DashboardStats } from '../../../application/dto/dashboard-stats';

class UsersStatsDto {
  @ApiProperty({ description: 'Total de usuarios.' })
  total!: number;

  @ApiProperty({ description: 'Usuarios activos (is_active = true).' })
  active!: number;
}

class CountDto {
  @ApiProperty()
  total!: number;
}

class BlogStatsDto {
  @ApiProperty({ description: 'Total de posts (cualquier estado).' })
  posts!: number;

  @ApiProperty({ description: 'Posts publicados.' })
  published!: number;

  @ApiProperty()
  categories!: number;

  @ApiProperty()
  tags!: number;
}

export class DashboardStatsResponseDto {
  @ApiProperty({ type: UsersStatsDto })
  users!: UsersStatsDto;

  @ApiProperty({ type: CountDto })
  roles!: CountDto;

  @ApiProperty({ type: CountDto })
  apiSections!: CountDto;

  @ApiProperty({ type: BlogStatsDto })
  blog!: BlogStatsDto;

  @ApiProperty({ type: CountDto, description: 'Ficheros no borrados.' })
  files!: CountDto;

  static from(stats: DashboardStats): DashboardStatsResponseDto {
    const dto = new DashboardStatsResponseDto();
    dto.users = stats.users;
    dto.roles = stats.roles;
    dto.apiSections = stats.apiSections;
    dto.blog = stats.blog;
    dto.files = stats.files;
    return dto;
  }
}
