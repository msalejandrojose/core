import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetMyFriendCodeUseCase } from '../../application/use-cases/get-my-friend-code.use-case';
import { ListFriendsUseCase } from '../../application/use-cases/list-friends.use-case';
import { ListPendingFriendRequestsUseCase } from '../../application/use-cases/list-pending-friend-requests.use-case';
import { RequestFriendshipUseCase } from '../../application/use-cases/request-friendship.use-case';
import { RespondFriendshipUseCase } from '../../application/use-cases/respond-friendship.use-case';
import { FriendCodeResponseDto } from './dto/friend-code.response.dto';
import {
  FriendResponseDto,
  FriendshipRequestResponseDto,
} from './dto/friend.response.dto';
import { FriendshipResponseDto } from './dto/friendship.response.dto';
import { RequestFriendshipDto } from './dto/request-friendship.dto';

// Modelo social mínimo (TASK-222): amigos por código corto compartido por
// fuera (WhatsApp, en persona) — sin búsqueda de usuarios ni agenda. Recíproca
// con aceptación: pedir amistad no hace amigos a nadie hasta que el otro
// responde que sí. Solo backend — la pantalla (compartir/introducir código,
// ver solicitudes y amigos) es TASK-258.
@ApiTags('racing')
@Auth()
@Controller('racing/friends')
export class FriendsController {
  constructor(
    private readonly getMyCode: GetMyFriendCodeUseCase,
    private readonly requestFriendship: RequestFriendshipUseCase,
    private readonly respondFriendship: RespondFriendshipUseCase,
    private readonly listFriends: ListFriendsUseCase,
    private readonly listPendingRequests: ListPendingFriendRequestsUseCase,
  ) {}

  @Get('me/code')
  @ApiOperation({
    summary: 'Mi código de amigo',
    description:
      'Se genera la primera vez que se pide y luego es siempre el mismo — es lo que se comparte por fuera para que otro jugador lo introduzca.',
  })
  @ApiOkResponse({ type: FriendCodeResponseDto })
  async myCode(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<FriendCodeResponseDto> {
    return FriendCodeResponseDto.fromDomain(
      await this.getMyCode.execute(current.sub),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Pide amistad al dueño de un código',
    description:
      'Crea una solicitud PENDING — no hace amigos a nadie hasta que el destinatario la acepta.',
  })
  @ApiOkResponse({ type: FriendshipResponseDto })
  async request(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: RequestFriendshipDto,
  ): Promise<FriendshipResponseDto> {
    return FriendshipResponseDto.fromDomain(
      await this.requestFriendship.execute(current.sub, body.code),
    );
  }

  @Get('requests')
  @ApiOperation({ summary: 'Solicitudes de amistad recibidas y pendientes' })
  @ApiOkResponse({ type: [FriendshipRequestResponseDto] })
  async requests(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<FriendshipRequestResponseDto[]> {
    const requests = await this.listPendingRequests.execute(current.sub);
    return requests.map((r) => FriendshipRequestResponseDto.fromDomain(r));
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Acepta una solicitud recibida' })
  @ApiOkResponse({ type: FriendshipResponseDto })
  async accept(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<FriendshipResponseDto> {
    return FriendshipResponseDto.fromDomain(
      await this.respondFriendship.execute(current.sub, id, true),
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rechaza una solicitud recibida' })
  @ApiOkResponse({ type: FriendshipResponseDto })
  async reject(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<FriendshipResponseDto> {
    return FriendshipResponseDto.fromDomain(
      await this.respondFriendship.execute(current.sub, id, false),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Mis amigos (solicitudes ya aceptadas)' })
  @ApiOkResponse({ type: [FriendResponseDto] })
  async friends(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<FriendResponseDto[]> {
    const friends = await this.listFriends.execute(current.sub);
    return friends.map((f) => FriendResponseDto.fromDomain(f));
  }
}
