import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { CreateInvitationUseCase } from '../../application/use-cases/create-invitation.use-case';
import { RedeemInvitationUseCase } from '../../application/use-cases/redeem-invitation.use-case';
import { InvitationResponseDto } from './dto/invitation.response.dto';
import { RedeemInvitationDto } from './dto/redeem-invitation.dto';
import { RedeemInvitationResponseDto } from './dto/redeem-invitation.response.dto';

// Mismo límite que el resto de endpoints públicos sensibles de auth: evita
// que se pueda fuerza-bruta el espacio de códigos de invitación.
const REDEEM_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('andanzas/invitations')
@Controller('andanzas/invitations')
export class InvitationsController {
  constructor(
    private readonly createInvitation: CreateInvitationUseCase,
    private readonly redeemInvitation: RedeemInvitationUseCase,
  ) {}

  @Post()
  @Auth()
  @ApiOperation({ summary: 'Generar una invitación nueva (máx. 5 activas por usuario).' })
  @ApiCreatedResponse({ type: InvitationResponseDto })
  async create(@CurrentUser() user: AccessTokenPayload): Promise<InvitationResponseDto> {
    const invitation = await this.createInvitation.execute({
      createdByUserId: user.sub,
    });
    return InvitationResponseDto.fromInvitation(invitation);
  }

  @Post(':code/redeem')
  @Public()
  @Throttle(REDEEM_THROTTLE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Canjear un código de invitación y crear la cuenta (público).',
  })
  @ApiOkResponse({ type: RedeemInvitationResponseDto })
  async redeem(
    @Param('code') code: string,
    @Body() dto: RedeemInvitationDto,
  ): Promise<RedeemInvitationResponseDto> {
    const result = await this.redeemInvitation.execute({ code, ...dto });
    return RedeemInvitationResponseDto.of(result.userId);
  }
}
