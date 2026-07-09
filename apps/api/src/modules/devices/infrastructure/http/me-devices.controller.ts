import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { RegisterDeviceUseCase } from '../../application/use-cases/register-device.use-case';
import { UnregisterDeviceUseCase } from '../../application/use-cases/unregister-device.use-case';
import { DeviceResponseDto } from './dto/device.response.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

// Registro de dispositivos push del usuario autenticado. Todo va scopeado a
// `current.sub`: un usuario solo registra/da de baja sus propios tokens. La app
// mobile llama a `POST /me/devices` en cada arranque y a `DELETE` al hacer
// logout.
@ApiTags('me/devices')
@Auth()
@Controller('me/devices')
export class MeDevicesController {
  constructor(
    private readonly registerDevice: RegisterDeviceUseCase,
    private readonly unregisterDevice: UnregisterDeviceUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar (o refrescar) el token de push de mi dispositivo.',
  })
  @ApiOkResponse({ type: DeviceResponseDto })
  async register(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: RegisterDeviceDto,
  ): Promise<DeviceResponseDto> {
    const device = await this.registerDevice.execute({
      userId: current.sub,
      token: body.token,
      platform: body.platform,
    });
    return DeviceResponseDto.fromDomain(device);
  }

  @Delete(':token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dar de baja el token de push de mi dispositivo (logout).',
  })
  @ApiNoContentResponse({
    description: 'Token dado de baja (idempotente: 204 aunque no existiera).',
  })
  async unregister(
    @CurrentUser() current: AccessTokenPayload,
    @Param('token') token: string,
  ): Promise<void> {
    await this.unregisterDevice.execute(current.sub, token);
  }
}
