import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ChangePasswordUseCase } from '../../application/use-cases/change-password.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LoginWithGoogleUseCase } from '../../application/use-cases/login-with-google.use-case';
import { LoginWithFacebookUseCase } from '../../application/use-cases/login-with-facebook.use-case';
import { LoginWithPlayGamesUseCase } from '../../application/use-cases/login-with-play-games.use-case';
import { LoginWithGameCenterUseCase } from '../../application/use-cases/login-with-game-center.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { VerifyEmailUseCase } from '../../application/use-cases/verify-email.use-case';
import { RequestPasswordResetUseCase } from '../../application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../../application/use-cases/reset-password.use-case';
import { StartGoogleAuthSessionUseCase } from '../../application/use-cases/start-google-auth-session.use-case';
import { CompleteGoogleAuthSessionUseCase } from '../../application/use-cases/complete-google-auth-session.use-case';
import { GetGoogleAuthSessionUseCase } from '../../application/use-cases/get-google-auth-session.use-case';
import { type AccessTokenPayload } from '../../application/ports/token-issuer.port';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { FacebookLoginDto } from './dto/facebook-login.dto';
import { PlayGamesLoginDto } from './dto/play-games-login.dto';
import { GameCenterLoginDto } from './dto/game-center-login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { GoogleAuthCallbackDto } from './dto/google-auth-callback.dto';
import { GoogleAuthStartResponseDto } from './dto/google-auth-start-response.dto';
import { GoogleAuthSessionResponseDto } from './dto/google-auth-session-response.dto';
import { renderGoogleAuthCallbackPage } from './google-auth-callback-page';

// Límite estricto para los endpoints públicos sensibles a fuerza bruta
// (login, register, reset): 10 peticiones/minuto por IP, por encima del límite
// global (más laxo). Anti brute-force / abuso de envío de emails.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
    private readonly loginWithGoogle: LoginWithGoogleUseCase,
    private readonly loginWithFacebook: LoginWithFacebookUseCase,
    private readonly loginWithPlayGames: LoginWithPlayGamesUseCase,
    private readonly loginWithGameCenter: LoginWithGameCenterUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly changePassword: ChangePasswordUseCase,
    private readonly startGoogleAuthSession: StartGoogleAuthSessionUseCase,
    private readonly completeGoogleAuthSession: CompleteGoogleAuthSessionUseCase,
    private readonly getGoogleAuthSession: GetGoogleAuthSessionUseCase,
  ) {}

  @Post('register')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Crear un usuario nuevo (público). Envía email de verificación.',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    const user = await this.registerUser.execute(dto);
    return UserResponseDto.fromUser(user);
  }

  @Post('login')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login con email + password. Devuelve un access token.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginAction(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.login.execute(dto);
    return { accessToken, user: UserResponseDto.fromUser(user) };
  }

  @Post('google')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Login/registro con Google. Verifica el ID token del SDK nativo y devuelve un access token.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginWithGoogleAction(
    @Body() dto: GoogleLoginDto,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.loginWithGoogle.execute(
      dto.idToken,
    );
    return { accessToken, user: UserResponseDto.fromUser(user) };
  }

  @Post('facebook')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Login/registro con Facebook. Verifica el access token del SDK nativo y devuelve un access token.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginWithFacebookAction(
    @Body() dto: FacebookLoginDto,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.loginWithFacebook.execute(
      dto.accessToken,
    );
    return { accessToken, user: UserResponseDto.fromUser(user) };
  }

  @Post('play-games')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Login/registro con Google Play Games Services. Canjea el serverAuthCode del SDK nativo y devuelve un access token. Sin email real del proveedor: la cuenta nueva nace con un email de relleno.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginWithPlayGamesAction(
    @Body() dto: PlayGamesLoginDto,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.loginWithPlayGames.execute(
      dto.serverAuthCode,
    );
    return { accessToken, user: UserResponseDto.fromUser(user) };
  }

  @Post('game-center')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Login/registro con Game Center. Verifica la firma de identidad del SDK nativo y devuelve un access token. Sin email real del proveedor: la cuenta nueva nace con un email de relleno.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginWithGameCenterAction(
    @Body() dto: GameCenterLoginDto,
  ): Promise<LoginResponseDto> {
    const { accessToken, user } = await this.loginWithGameCenter.execute({
      playerId: dto.playerId,
      bundleId: dto.bundleId,
      timestamp: dto.timestamp,
      signature: dto.signature,
      salt: dto.salt,
      publicKeyUrl: dto.publicKeyUrl,
    });
    return { accessToken, user: UserResponseDto.fromUser(user) };
  }

  @Post('google/start')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Inicia un login con Google desde un cliente sin navegador embebido (Godot). ' +
      'Devuelve la URL de consentimiento a abrir en el navegador del sistema y un ' +
      'id de sesión para hacer polling.',
  })
  @ApiOkResponse({ type: GoogleAuthStartResponseDto })
  async startGoogleAuthSessionAction(): Promise<GoogleAuthStartResponseDto> {
    const start = await this.startGoogleAuthSession.execute();
    return GoogleAuthStartResponseDto.from(start);
  }

  @Get('google/callback')
  @Public()
  @ApiOperation({
    summary:
      'Callback al que Google redirige el navegador tras el consentimiento. ' +
      'No lo llama la app: solo Google.',
  })
  async googleAuthCallbackAction(
    @Query() dto: GoogleAuthCallbackDto,
    @Res() res: Response,
  ): Promise<void> {
    let ok: boolean;
    try {
      ok = await this.completeGoogleAuthSession.execute(dto.state, dto.code);
    } catch {
      ok = false;
    }
    res.type('html').send(renderGoogleAuthCallbackPage(ok));
  }

  @Get('google/session/:id')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary:
      'Consulta el estado de una sesión de login con Google (polling desde la app).',
  })
  @ApiOkResponse({ type: GoogleAuthSessionResponseDto })
  async getGoogleAuthSessionAction(
    @Param('id') id: string,
  ): Promise<GoogleAuthSessionResponseDto> {
    const result = await this.getGoogleAuthSession.execute(id);
    return GoogleAuthSessionResponseDto.from(result);
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Devuelve el usuario autenticado.' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<UserResponseDto> {
    const user = await this.getCurrentUser.execute(current.sub);
    return UserResponseDto.fromUser(user);
  }

  @Get('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifica el token de email y activa la cuenta.' })
  @ApiOkResponse({
    schema: { example: { message: 'Email verificado correctamente.' } },
  })
  async verifyEmailAction(
    @Query() dto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    await this.verifyEmail.execute(dto.token);
    return { message: 'Email verificado correctamente.' };
  }

  @Post('request-password-reset')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Solicita el reset de contraseña. Envía email si la cuenta existe.',
  })
  @ApiOkResponse({
    schema: {
      example: { message: 'Si el email existe recibirás instrucciones.' },
    },
  })
  async requestPasswordResetAction(
    @Body() dto: RequestResetDto,
  ): Promise<{ message: string }> {
    await this.requestPasswordReset.execute(dto.email);
    return {
      message:
        'Si el email existe recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  @Post('reset-password')
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aplica el reset de contraseña con el token recibido por email.',
  })
  @ApiOkResponse({
    schema: { example: { message: 'Contraseña actualizada correctamente.' } },
  })
  async resetPasswordAction(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.resetPassword.execute({
      token: dto.token,
      password: dto.password,
    });
    return { message: 'Contraseña actualizada correctamente.' };
  }

  @Post('change-password')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambia la contraseña del usuario autenticado.',
  })
  @ApiOkResponse({
    schema: { example: { message: 'Contraseña actualizada correctamente.' } },
  })
  async changePasswordAction(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.changePassword.execute({
      userId: current.sub,
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
    return { message: 'Contraseña actualizada correctamente.' };
  }
}
