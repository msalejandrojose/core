import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { CreateRoleUseCase } from '../../application/use-cases/create-role.use-case';
import { DeleteRoleUseCase } from '../../application/use-cases/delete-role.use-case';
import { GetRoleUseCase } from '../../application/use-cases/get-role.use-case';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.use-case';
import { UpdateRoleUseCase } from '../../application/use-cases/update-role.use-case';
import { RequiresPermission } from './decorators/requires-permission.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles-query.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly getRole: GetRoleUseCase,
    private readonly createRole: CreateRoleUseCase,
    private readonly updateRole: UpdateRoleUseCase,
    private readonly deleteRole: DeleteRoleUseCase,
  ) {}

  @Get()
  @RequiresPermission('iam.roles', 'READ')
  @ApiOperation({ summary: 'Listar roles (paginado).' })
  @ApiPaginatedResponse(RoleResponseDto)
  async list(
    @Query() query: ListRolesQueryDto,
  ): Promise<PaginatedResponseDto<RoleResponseDto>> {
    const { items, total } = await this.listRoles.execute({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      scope: query.scope,
      codeContains: query.codeContains,
    });
    return PaginatedResponseDto.of(
      items.map(RoleResponseDto.fromRole),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('iam.roles', 'READ')
  @ApiOperation({ summary: 'Obtener un rol por id.' })
  @ApiOkResponse({ type: RoleResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<RoleResponseDto> {
    return RoleResponseDto.fromRole(await this.getRole.execute(id));
  }

  @Post()
  @RequiresPermission('iam.roles', 'WRITE')
  @ApiOperation({ summary: 'Crear un rol.' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  async create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    const role = await this.createRole.execute({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      scope: dto.scope,
      parentRoleId: dto.parentRoleId ?? null,
    });
    return RoleResponseDto.fromRole(role);
  }

  @Patch(':id')
  @RequiresPermission('iam.roles', 'WRITE')
  @ApiOperation({ summary: 'Actualizar parcialmente un rol.' })
  @ApiOkResponse({ type: RoleResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.updateRole.execute(id, dto);
    return RoleResponseDto.fromRole(role);
  }

  @Delete(':id')
  @RequiresPermission('iam.roles', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar un rol (falla si está en uso).' })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteRole.execute(id);
  }
}
