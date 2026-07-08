import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { CountUnreadNotificationsUseCase } from '../../application/use-cases/count-unread-notifications.use-case';
import { ListUserNotificationsUseCase } from '../../application/use-cases/list-user-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from '../../application/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from '../../application/use-cases/mark-notification-read.use-case';
import { ListUserNotificationsQueryDto } from './dto/list-user-notifications.query.dto';
import { UserNotificationResponseDto } from './dto/user-notification.response.dto';

// Inbox in-app del usuario autenticado. Todo va scopeado a `current.sub`; un
// usuario nunca ve ni toca notificaciones de otro.
@ApiTags('me/notifications')
@Auth()
@Controller('me/notifications')
export class MeNotificationsController {
  constructor(
    private readonly listNotifications: ListUserNotificationsUseCase,
    private readonly countUnread: CountUnreadNotificationsUseCase,
    private readonly markRead: MarkNotificationReadUseCase,
    private readonly markAllRead: MarkAllNotificationsReadUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis notificaciones (paginado por cursor).' })
  @ApiCursorPaginatedResponse(UserNotificationResponseDto)
  async list(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: ListUserNotificationsQueryDto,
  ): Promise<CursorPaginatedResponseDto<UserNotificationResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listNotifications.execute({
      userId: current.sub,
      limit,
      cursor: query.cursor,
      unreadOnly: query.unread,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((n) => UserNotificationResponseDto.fromDomain(n)),
      page.nextCursor,
      limit,
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Número de notificaciones no leídas (para el badge).',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { count: { type: 'integer', example: 3 } },
      required: ['count'],
    },
  })
  async unreadCount(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<{ count: number }> {
    const count = await this.countUnread.execute(current.sub);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída.' })
  @ApiOkResponse({ type: UserNotificationResponseDto })
  async read(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserNotificationResponseDto> {
    const notification = await this.markRead.execute(id, current.sub);
    return UserNotificationResponseDto.fromDomain(notification);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas mis notificaciones como leídas.' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { updated: { type: 'integer', example: 5 } },
      required: ['updated'],
    },
  })
  async readAll(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<{ updated: number }> {
    const updated = await this.markAllRead.execute(current.sub);
    return { updated };
  }
}
