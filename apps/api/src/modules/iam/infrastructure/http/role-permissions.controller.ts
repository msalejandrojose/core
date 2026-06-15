import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GrantRolePermissionUseCase } from '../../application/use-cases/grant-role-permission.use-case';
import { ListRolePermissionsUseCase } from '../../application/use-cases/list-role-permissions.use-case';
import { RevokeRolePermissionUseCase } from '../../application/use-cases/revoke-role-permission.use-case';
import { RequiresPermission } from './decorators/requires-permission.decorator';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { PermissionEntryDto } from './dto/permission-entry.dto';

@ApiTags('role-permissions')
@Controller('roles/:roleId/permissions')
export class RolePermissionsController {
  constructor(
    private readonly listPerms: ListRolePermissionsUseCase,
    private readonly grant: GrantRolePermissionUseCase,
    private readonly revoke: RevokeRolePermissionUseCase,
  ) {}

  @Get()
  @RequiresPermission('iam.permissions', 'READ')
  @ApiOperation({ summary: 'Listar permisos asignados a un rol.' })
  @ApiOkResponse({ type: PermissionEntryDto, isArray: true })
  async list(
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<PermissionEntryDto[]> {
    const entries = await this.listPerms.execute(roleId);
    return entries.map((e) => PermissionEntryDto.of(e.apiSectionId, e.permissionLevel));
  }

  @Put(':sectionId')
  @RequiresPermission('iam.permissions', 'WRITE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Setear (upsert) permiso de un rol sobre una sección.' })
  @ApiNoContentResponse()
  async grantPermission(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: GrantPermissionDto,
  ): Promise<void> {
    await this.grant.execute(roleId, sectionId, dto.level);
  }

  @Delete(':sectionId')
  @RequiresPermission('iam.permissions', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar permiso de un rol sobre una sección.' })
  @ApiNoContentResponse()
  async revokePermission(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ): Promise<void> {
    await this.revoke.execute(roleId, sectionId);
  }
}
