import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Param, Post, Req } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { GetPublicFormUseCase } from '../../application/use-cases/get-public-form.use-case';
import { SubmitFormResponseUseCase } from '../../application/use-cases/submit-form-response.use-case';
import { FormInstanceResponseDto } from './dto/form-instance.response.dto';
import { FormResponseDto } from './dto/form.response.dto';
import { FormResponseResponseDto } from './dto/form-response.response.dto';
import { SubmitFormResponseDto } from './dto/submit-form-response.dto';
import { ApiProperty } from '@nestjs/swagger';

class PublicFormResponseDto {
  @ApiProperty() form: Pick<FormResponseDto, 'id' | 'title' | 'description' | 'schema'>;
  @ApiProperty() instance: Pick<FormInstanceResponseDto, 'id' | 'hash' | 'responsePolicy' | 'requiresAuth' | 'opensAt' | 'closesAt' | 'maxResponses' | 'status'>;
}

// Endpoints públicos: sin autenticación requerida (opt-in por instancia).
// Rate limiting se debe configurar a nivel de NestJS o gateway.
@ApiTags('dynamic-forms')
@Public()
@Controller('public/forms')
export class PublicFormsController {
  constructor(
    private readonly getPublicForm: GetPublicFormUseCase,
    private readonly submitResponse: SubmitFormResponseUseCase,
  ) {}

  @Get(':hash')
  @ApiOperation({ summary: 'Obtener schema y metadatos de un formulario por hash' })
  @ApiOkResponse({ type: PublicFormResponseDto })
  async get(@Param('hash') hash: string): Promise<PublicFormResponseDto> {
    return this.getPublicForm.execute(hash);
  }

  @Post(':hash/responses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enviar respuesta a un formulario público' })
  @ApiCreatedResponse({ type: FormResponseResponseDto })
  async submit(
    @Param('hash') hash: string,
    @Body() dto: SubmitFormResponseDto,
    @Req() req: Request,
    @CurrentUser() user?: AccessTokenPayload,
  ): Promise<FormResponseResponseDto> {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;

    const response = await this.submitResponse.execute({
      hash,
      answers: dto.answers,
      submittedById: user?.sub ?? null,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return FormResponseResponseDto.fromDomain(response);
  }
}
