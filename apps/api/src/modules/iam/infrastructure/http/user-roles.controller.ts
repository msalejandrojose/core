import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../application/ports/token-issuer.port';
import { AssignRoleToUserUseCase } from '../../application/use-cases/assign-role-to-user.use-case';
import { ListUserRolesUseCase } from '../../application/use-cases/list-user-roles.use-case';
import { UnassignRoleFromUserUseCase } from '../../application/use-cases/unassign-role-from-user.use-case';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequiresPermission } from './decorators/requires-permission.decorator';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';

@ApiTags('user-roles')
@Controller('users/:userId/roles')
export class UserRolesController {
  constructor(
    private readonly listUserRoles: ListUserRolesUseCase,
    private readonly assignRole: AssignRoleToUserUseCase,
    private readonly unassignRole: UnassignRoleFromUserUseCase,
  ) {}

  @Get()
  @RequiresPermission('iam.users', 'READ')
  @ApiOperation({ summary: 'Listar roles asignados a un usuario.' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  async list(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<RoleResponseDto[]> {
    const roles = await this.listUserRoles.execute(userId);
    return roles.map(RoleResponseDto.fromRole);
  }

  @Post()
  @RequiresPermission('iam.users', 'WRITE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Asignar un rol a un usuario.' })
  @ApiNoContentResponse()
  async assign(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<void> {
    await this.assignRole.execute(userId, dto.roleId, current.sub);
  }

  @Delete(':roleId')
  @RequiresPermission('iam.users', 'WRITE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un rol a un usuario.' })
  @ApiNoContentResponse()
  async unassign(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    await this.unassignRole.execute(userId, roleId);
  }
}
