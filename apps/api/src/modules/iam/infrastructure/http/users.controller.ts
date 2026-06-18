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
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import { DeactivateUserUseCase } from '../../application/use-cases/deactivate-user.use-case';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from '../../application/use-cases/update-user.use-case';
import { RequiresPermission } from './decorators/requires-permission.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deactivateUser: DeactivateUserUseCase,
  ) {}

  @Get()
  @RequiresPermission('iam.users', 'READ')
  @ApiOperation({
    summary: 'Listar usuarios (cursor paginado, createdAt DESC).',
  })
  @ApiCursorPaginatedResponse(UserResponseDto)
  async list(
    @Query() query: ListUsersQueryDto,
  ): Promise<CursorPaginatedResponseDto<UserResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listUsers.executeWithCursor({
      limit,
      cursor: query.cursor,
      userType: query.userType,
      isActive: query.isActive,
      emailContains: query.emailContains,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map(UserResponseDto.fromUser),
      page.nextCursor,
      limit,
    );
  }

  @Get(':id')
  @RequiresPermission('iam.users', 'READ')
  @ApiOperation({ summary: 'Obtener un usuario por id.' })
  @ApiOkResponse({ type: UserResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    const user = await this.getUser.execute(id);
    return UserResponseDto.fromUser(user);
  }

  @Post()
  @RequiresPermission('iam.users', 'WRITE')
  @ApiOperation({ summary: 'Crear un usuario (admin).' })
  @ApiCreatedResponse({ type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.createUser.execute(dto);
    return UserResponseDto.fromUser(user);
  }

  @Patch(':id')
  @RequiresPermission('iam.users', 'WRITE')
  @ApiOperation({ summary: 'Actualizar parcialmente un usuario.' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateUser.execute(id, dto);
    return UserResponseDto.fromUser(user);
  }

  @Delete(':id')
  @RequiresPermission('iam.users', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar un usuario (soft delete).' })
  @ApiNoContentResponse()
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deactivateUser.execute(id);
  }
}
