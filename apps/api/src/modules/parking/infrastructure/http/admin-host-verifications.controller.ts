import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { ListHostVerificationsUseCase } from '../../application/use-cases/list-host-verifications.use-case';
import { ReviewHostVerificationUseCase } from '../../application/use-cases/review-host-verification.use-case';
import { HostVerificationResponseDto } from './dto/host-verification.response.dto';
import { ListHostVerificationsQueryDto } from './dto/list-host-verifications.query.dto';
import { RejectHostVerificationDto } from './dto/reject-host-verification.dto';

// Backoffice: cola de revisión del KYC básico de hosts (TASK-155). Protegido
// por el árbol de permisos, igual que `parking/admin`.
@ApiTags('parking-admin')
@Controller('parking/admin/host-verifications')
export class AdminHostVerificationsController {
  constructor(
    private readonly listHostVerifications: ListHostVerificationsUseCase,
    private readonly reviewHostVerification: ReviewHostVerificationUseCase,
    private readonly viewTokens: FileViewTokenService,
  ) {}

  @Get()
  @RequiresPermission('parking', 'READ')
  @ApiOperation({ summary: 'Listar solicitudes de verificación de host' })
  @ApiCursorPaginatedResponse(HostVerificationResponseDto)
  async list(
    @Query() query: ListHostVerificationsQueryDto,
  ): Promise<CursorPaginatedResponseDto<HostVerificationResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listHostVerifications.execute({
      limit,
      cursor: query.cursor,
      status: query.status,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((v) =>
        HostVerificationResponseDto.fromDomain(v, this.viewTokens),
      ),
      page.nextCursor,
      limit,
    );
  }

  @Post(':id/approve')
  @RequiresPermission('parking', 'WRITE')
  @ApiOperation({ summary: 'Aprobar una verificación de host' })
  @ApiOkResponse({ type: HostVerificationResponseDto })
  async approve(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<HostVerificationResponseDto> {
    const verification = await this.reviewHostVerification.execute({
      id,
      reviewerUserId: current.sub,
      approve: true,
    });
    return HostVerificationResponseDto.fromDomain(
      verification,
      this.viewTokens,
    );
  }

  @Post(':id/reject')
  @RequiresPermission('parking', 'WRITE')
  @ApiOperation({ summary: 'Rechazar una verificación de host' })
  @ApiOkResponse({ type: HostVerificationResponseDto })
  async reject(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectHostVerificationDto,
  ): Promise<HostVerificationResponseDto> {
    const verification = await this.reviewHostVerification.execute({
      id,
      reviewerUserId: current.sub,
      approve: false,
      rejectionReason: dto.reason,
    });
    return HostVerificationResponseDto.fromDomain(
      verification,
      this.viewTokens,
    );
  }
}
