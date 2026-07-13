import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { GetMyHostVerificationUseCase } from '../../application/use-cases/get-my-host-verification.use-case';
import { SubmitHostVerificationUseCase } from '../../application/use-cases/submit-host-verification.use-case';
import { HostVerificationResponseDto } from './dto/host-verification.response.dto';
import { SubmitHostVerificationDto } from './dto/submit-host-verification.dto';

// KYC básico del host autenticado (TASK-155): enviar/reenviar la solicitud y
// consultar su estado. La revisión (aprobar/rechazar) es cosa del backoffice
// (`AdminHostVerificationsController`).
@ApiTags('me/host-verification')
@Auth()
@Controller('me/host-verification')
export class MyHostVerificationController {
  constructor(
    private readonly submitHostVerification: SubmitHostVerificationUseCase,
    private readonly getMyHostVerification: GetMyHostVerificationUseCase,
    private readonly viewTokens: FileViewTokenService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mi solicitud de verificación de host (si existe)' })
  @ApiOkResponse({
    type: HostVerificationResponseDto,
    description: 'null si no se ha enviado ninguna solicitud aún.',
  })
  async get(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<HostVerificationResponseDto | null> {
    const verification = await this.getMyHostVerification.execute(current.sub);
    return verification
      ? HostVerificationResponseDto.fromDomain(verification, this.viewTokens)
      : null;
  }

  @Post()
  @ApiOperation({ summary: 'Enviar (o reenviar) mi verificación de identidad' })
  @ApiOkResponse({ type: HostVerificationResponseDto })
  async submit(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: SubmitHostVerificationDto,
  ): Promise<HostVerificationResponseDto> {
    const verification = await this.submitHostVerification.execute({
      hostUserId: current.sub,
      legalName: dto.legalName,
      documentFileId: dto.documentFileId,
    });
    return HostVerificationResponseDto.fromDomain(
      verification,
      this.viewTokens,
    );
  }
}
