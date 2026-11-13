import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import type { RecoveryOptionId } from '../../domain/services/recovery';
import {
  ApplyRecoveryOptionUseCase,
  GetRecoveryUseCase,
  type RecoveryView,
} from '../../application/use-cases/recovery.use-cases';

const OPTION_IDS: RecoveryOptionId[] = ['KEEP', 'EASY', 'MOVE', 'REST'];

export class ApplyRecoveryDto {
  @ApiProperty({ enum: OPTION_IDS })
  @IsIn(OPTION_IDS)
  option!: RecoveryOptionId;
}

// Recuperación: una estimación orientativa, no un diagnóstico.
@ApiTags('ritmo')
@Auth()
@Controller('ritmo/recovery')
export class RitmoRecoveryController {
  constructor(
    private readonly getRecovery: GetRecoveryUseCase,
    private readonly apply: ApplyRecoveryOptionUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Mi recuperación estimada de hoy y propuestas para mañana.',
  })
  @ApiOkResponse({ description: 'Puntuación, factores y opciones.' })
  get(@CurrentUser() current: AccessTokenPayload): Promise<RecoveryView> {
    return this.getRecovery.execute(current.sub);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplicar una propuesta a la sesión de mañana.' })
  @ApiOkResponse({ description: 'Recuperación con el plan ya cambiado.' })
  post(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: ApplyRecoveryDto,
  ): Promise<RecoveryView> {
    return this.apply.execute(current.sub, dto.option);
  }
}
