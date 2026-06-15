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
import { GrantUserPermissionUseCase } from '../../application/use-cases/grant-user-permission.use-case';
import { ListUserPermissionsUseCase } from '../../application/use-cases/list-user-permissions.use-case';
import { RevokeUserPermissionUseCase } from '../../application/use-cases/revoke-user-permission.use-case';
import { RequiresPermission } from './decorators/requires-permission.decorator';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { PermissionEntryDto } from './dto/permission-entry.dto';

@ApiTags('user-permissions')
@Controller('users/:userId/permissions')
export class UserPermissionsController {
  constructor(
    private readonly listPerms: ListUserPermissionsUseCase,
    private readonly grant: GrantUserPermissionUseCase,
    private readonly revoke: RevokeUserPermissionUseCase,
  ) {}

  @Get()
  @RequiresPermission('iam.permissions', 'READ')
  @ApiOperation({ summary: 'Listar overrides de permisos del usuario.' })
  @ApiOkResponse({ type: PermissionEntryDto, isArray: true })
  async list(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<PermissionEntryDto[]> {
    const entries = await this.listPerms.execute(userId);
    return entries.map((e) => PermissionEntryDto.of(e.apiSectionId, e.permissionLevel));
  }

  @Put(':sectionId')
  @RequiresPermission('iam.permissions', 'WRITE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Setear (upsert) override de permiso para el usuario.' })
  @ApiNoContentResponse()
  async grantPermission(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: GrantPermissionDto,
  ): Promise<void> {
    await this.grant.execute(userId, sectionId, dto.level);
  }

  @Delete(':sectionId')
  @RequiresPermission('iam.permissions', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revocar override de permiso del usuario.' })
  @ApiNoContentResponse()
  async revokePermission(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ): Promise<void> {
    await this.revoke.execute(userId, sectionId);
  }
}
