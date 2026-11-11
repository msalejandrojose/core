import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetMyProfileUseCase } from '../../application/use-cases/get-my-profile.use-case';
import { SaveMyProfileUseCase } from '../../application/use-cases/save-my-profile.use-case';
import { LogWeightUseCase } from '../../application/use-cases/log-weight.use-case';
import { LogWeightDto } from './dto/log-weight.dto';
import { MeasurementResponseDto } from './dto/measurement.response.dto';
import { ProfileResponseDto } from './dto/profile.response.dto';
import { SaveProfileDto } from './dto/save-profile.dto';

const DEFAULT_TIMEZONE = 'Europe/Madrid';

// Perfil y peso del usuario autenticado. Todo va scopeado a `current.sub`: no
// hay forma de leer ni escribir el perfil de otra persona desde la app.
@ApiTags('ritmo')
@Auth()
@Controller('ritmo')
export class RitmoProfileController {
  constructor(
    private readonly getMyProfile: GetMyProfileUseCase,
    private readonly saveMyProfile: SaveMyProfileUseCase,
    private readonly logWeight: LogWeightUseCase,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Mi perfil de actividad, con los targets calculados.' })
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiNotFoundResponse({
    description:
      'RITMO_PROFILE_NOT_FOUND: el usuario aún no ha hecho el onboarding.',
  })
  async profile(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<ProfileResponseDto> {
    return ProfileResponseDto.from(await this.getMyProfile.execute(current.sub));
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Guardar mi perfil (onboarding o edición) y recalcular los targets.',
  })
  @ApiOkResponse({ type: ProfileResponseDto })
  async saveProfile(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: SaveProfileDto,
  ): Promise<ProfileResponseDto> {
    const saved = await this.saveMyProfile.execute({
      userId: current.sub,
      sex: body.sex ?? null,
      birthDate: body.birthDate ?? null,
      heightCm: body.heightCm ?? null,
      activityLevel: body.activityLevel,
      goalType: body.goalType,
      targetWeightKg: body.targetWeightKg ?? null,
      weeklyWeightChangeKg: body.weeklyWeightChangeKg ?? null,
      timezone: body.timezone ?? DEFAULT_TIMEZONE,
    });
    return ProfileResponseDto.from(saved);
  }

  @Post('weight')
  @ApiOperation({
    summary: 'Registrar una pesada (recalcula targets y el resumen del día).',
  })
  @ApiCreatedResponse({ type: MeasurementResponseDto })
  async weight(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: LogWeightDto,
  ): Promise<MeasurementResponseDto> {
    const measurement = await this.logWeight.execute({
      userId: current.sub,
      // Sin fecha explícita la resuelve el use case con la zona del perfil:
      // el día natural no lo decide el cliente.
      measuredOn: body.measuredOn ?? null,
      weightKg: body.weightKg,
      bodyFatPct: body.bodyFatPct ?? null,
      waistCm: body.waistCm ?? null,
      notes: body.notes ?? null,
    });
    return MeasurementResponseDto.from(measurement);
  }
}
