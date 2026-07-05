import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { CaptureLeadUseCase } from '../../application/use-cases/capture-lead.use-case';
import { CaptureLeadDto } from './dto/capture-lead.dto';

/** Respuesta mínima de captura: no expone datos internos del lead. */
class CaptureLeadResultDto {
  @ApiProperty() id: string;
  @ApiProperty() status: string;
}

// Captura pública: sin autenticación requerida. Rate-limit / honeypot deben
// configurarse a nivel de gateway (spec `leads` §11).
@ApiTags('leads')
@Public()
@Controller('public/leads')
export class PublicLeadsController {
  constructor(private readonly captureLead: CaptureLeadUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Capturar un lead desde web/API' })
  @ApiCreatedResponse({ type: CaptureLeadResultDto })
  async capture(
    @Body() dto: CaptureLeadDto,
    @CurrentUser() user?: AccessTokenPayload,
  ): Promise<CaptureLeadResultDto> {
    const lead = await this.captureLead.execute({
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      company: dto.company ?? null,
      source: dto.source ?? 'WEB_FORM',
      formResponseId: dto.formResponseId ?? null,
      utmSource: dto.utmSource ?? null,
      utmMedium: dto.utmMedium ?? null,
      utmCampaign: dto.utmCampaign ?? null,
      customFields: dto.customFields ?? null,
      consentGiven: dto.consentGiven ?? false,
      createdById: user?.sub ?? null,
    });
    return { id: lead.id, status: lead.status };
  }
}
