import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { type AccessTokenPayload } from '../../application/ports/token-issuer.port';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Crear un usuario nuevo (público). Envía email de verificación.' })
  @ApiCreatedResponse({ type: UserResponseDto })
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.registerUser.execute(dto);
    return UserResponseDto.fromUser(user);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login con email + password. Devuelve un access token.' })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginAction(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.login.execute(dto);
    return { accessToken, user: UserResponseDto.fromUser(user) };
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Devuelve el usuario autenticado.' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(@CurrentUser() current: AccessTokenPayload): Promise<UserResponseDto> {
    const user = await this.getCurrentUser.execute(current.sub);
    return UserResponseDto.fromUser(user);
  }

  @Get('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica el token de email y activa la cuenta.' })
  @ApiOkResponse({ schema: { example: { message: 'Email verificado correctamente.' } } })
  async verifyEmailAction(@Query() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.verifyEmail.execute(dto.token);
    return { message: 'Email verificado correctamente.' };
  }

  @Post('request-password-reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicita el reset de contraseña. Envía email si la cuenta existe.' })
  @ApiOkResponse({ schema: { example: { message: 'Si el email existe recibirás instrucciones.' } } })
  async requestPasswordResetAction(
    @Body() dto: RequestResetDto,
  ): Promise<{ message: string }> {
    await this.requestPasswordReset.execute(dto.email);
    return { message: 'Si el email existe recibirás instrucciones para restablecer tu contraseña.' };
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aplica el reset de contraseña con el token recibido por email.' })
  @ApiOkResponse({ schema: { example: { message: 'Contraseña actualizada correctamente.' } } })
  async resetPasswordAction(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.resetPassword.execute({ token: dto.token, password: dto.password });
    return { message: 'Contraseña actualizada correctamente.' };
  }
}
