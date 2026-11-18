import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { OAuthError } from '../../domain/errors/oauth.error';
import { OAUTH_SCOPES } from '../../domain/services/oauth';
import {
  DecideAuthorizationUseCase,
  IssueOAuthTokenUseCase,
  ManageOAuthConnectionsUseCase,
  RegisterOAuthClientUseCase,
  ValidateAuthorizeRequestUseCase,
  type AuthorizeParams,
  type ClientRegistration,
} from '../../application/use-cases/oauth.use-cases';
import type { OAuthConnection } from '../../application/ports/oauth-repository.port';
import { type AccessTokenPayload } from '../../application/ports/token-issuer.port';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  renderOAuthAuthorizePage,
  renderOAuthErrorPage,
} from './oauth-authorize-page';
import { publicBaseUrl } from './oauth-urls';

/** Una aplicación con acceso (p. ej. Claude), para listarla y desconectarla. */
class OAuthConnectionResponseDto {
  @ApiProperty() clientId!: string;
  @ApiProperty({ example: 'Claude' }) clientName!: string;
  @ApiProperty({ example: 'ritmo' }) scope!: string;
  @ApiProperty({ type: String, format: 'date-time' }) connectedAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastUsedAt!: Date | null;
}

const OAUTH_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

function authorizeParams(src: Record<string, unknown>): AuthorizeParams {
  return {
    response_type: str(src.response_type),
    client_id: str(src.client_id),
    redirect_uri: str(src.redirect_uri),
    state: str(src.state),
    scope: str(src.scope),
    code_challenge: str(src.code_challenge),
    code_challenge_method: str(src.code_challenge_method),
    resource: str(src.resource),
  };
}

/** Respuesta OAuth: errores `{ error, error_description }`, nunca el formato de errores de la app. */
async function oauthReply(
  res: Response,
  run: () => Promise<unknown>,
  status = 200,
): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  try {
    res.status(status).json(await run());
  } catch (e) {
    if (e instanceof OAuthError) {
      res
        .status(e.status)
        .json({ error: e.code, error_description: e.description });
      return;
    }
    throw e;
  }
}

/**
 * Servidor de autorización OAuth 2.1 para conectores externos (clientes MCP
 * como Claude). Solo `authorization_code` + PKCE S256, clientes públicos con
 * registro dinámico (RFC 7591), metadatos RFC 8414 y rotación de refresh.
 */
@ApiTags('oauth')
@Controller()
export class OAuthController {
  constructor(
    private readonly register: RegisterOAuthClientUseCase,
    private readonly validate: ValidateAuthorizeRequestUseCase,
    private readonly decide: DecideAuthorizationUseCase,
    private readonly tokens: IssueOAuthTokenUseCase,
    private readonly connections: ManageOAuthConnectionsUseCase,
  ) {}

  /** RFC 8414. Fuera del prefijo `/v1` (ver main.ts): los clientes lo buscan en la raíz. */
  @Get('.well-known/oauth-authorization-server')
  @Public()
  @ApiExcludeEndpoint()
  metadata(@Req() req: Request) {
    const base = publicBaseUrl(req);
    return {
      issuer: base,
      authorization_endpoint: `${base}/v1/oauth/authorize`,
      token_endpoint: `${base}/v1/oauth/token`,
      registration_endpoint: `${base}/v1/oauth/register`,
      revocation_endpoint: `${base}/v1/oauth/revoke`,
      scopes_supported: Object.keys(OAUTH_SCOPES),
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'],
      code_challenge_methods_supported: ['S256'],
      authorization_response_iss_parameter_supported: true,
    };
  }

  @Post('oauth/register')
  @Public()
  @Throttle(OAUTH_THROTTLE)
  @ApiOperation({
    summary: 'Registro dinámico de un cliente OAuth público (RFC 7591).',
  })
  async registerClient(
    @Body() body: ClientRegistration,
    @Res() res: Response,
  ): Promise<void> {
    await oauthReply(
      res,
      async () => {
        const c = await this.register.execute(body ?? {});
        return {
          client_id: c.clientId,
          client_id_issued_at: Math.floor(c.createdAt.getTime() / 1000),
          client_name: c.name,
          redirect_uris: c.redirectUris,
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: c.tokenEndpointAuthMethod,
        };
      },
      201,
    );
  }

  @Get('oauth/authorize')
  @Public()
  @ApiOperation({
    summary: 'Pantalla de inicio de sesión y consentimiento (HTML).',
  })
  async authorize(
    @Query() query: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const params = authorizeParams(query);
    const v = await this.validate.execute(params);
    res.setHeader('Cache-Control', 'no-store');
    // La pantalla de consentimiento no se puede incrustar en otra web (clickjacking).
    res.setHeader('X-Frame-Options', 'DENY');
    if (!v.ok) {
      if (v.redirectTo) {
        res.redirect(
          302,
          `${v.redirectTo}${v.redirectTo.includes('?') ? '&' : '?'}iss=${encodeURIComponent(publicBaseUrl(req))}`,
        );
        return;
      }
      res
        .status(400)
        .type('html')
        .send(renderOAuthErrorPage(v.error.description));
      return;
    }
    res.type('html').send(
      renderOAuthAuthorizePage({
        clientName: v.request.client.name,
        redirectHost:
          new URL(v.request.redirectUri).host || v.request.redirectUri,
        scopeLabels: v.request.scopeLabels,
        params: { ...params, redirect_uri: v.request.redirectUri },
      }),
    );
  }

  @Post('oauth/authorize/decision')
  @Public()
  @Throttle(OAUTH_THROTTLE)
  @ApiExcludeEndpoint()
  async decision(
    @Body()
    body: {
      params?: Record<string, unknown>;
      approve?: boolean;
      accessToken?: string | null;
    },
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await oauthReply(res, async () => ({
      redirectTo: await this.decide.execute(
        authorizeParams(body?.params ?? {}),
        body?.accessToken ?? '',
        body?.approve === true,
        publicBaseUrl(req),
      ),
    }));
  }

  @Post('oauth/token')
  @Public()
  @Throttle(OAUTH_THROTTLE)
  @ApiOperation({
    summary: 'Canjea un código (PKCE) o un refresh token por tokens de acceso.',
  })
  async token(
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    await oauthReply(res, () => {
      const grant = str(body?.grant_type);
      if (grant === 'authorization_code') {
        return this.tokens.exchangeCode({
          code: str(body.code),
          code_verifier: str(body.code_verifier),
          client_id: str(body.client_id),
          redirect_uri: str(body.redirect_uri),
          resource: str(body.resource),
        });
      }
      if (grant === 'refresh_token') {
        return this.tokens.refresh({
          refresh_token: str(body.refresh_token),
          client_id: str(body.client_id),
          scope: str(body.scope),
        });
      }
      throw new OAuthError(
        'unsupported_grant_type',
        'Solo authorization_code y refresh_token.',
      );
    });
  }

  @Post('oauth/revoke')
  @Public()
  @Throttle(OAUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoca un access o refresh token (RFC 7009).' })
  async revoke(
    @Body() body: Record<string, unknown>,
  ): Promise<Record<string, never>> {
    const token = str(body?.token);
    if (token) await this.connections.revokeToken(token);
    return {};
  }

  @Get('oauth/connections')
  @Auth()
  @ApiOperation({
    summary: 'Mis aplicaciones conectadas por OAuth (p. ej. Claude).',
  })
  @ApiOkResponse({
    type: [OAuthConnectionResponseDto],
    description: 'Una por cliente con acceso vivo.',
  })
  list(@CurrentUser() current: AccessTokenPayload): Promise<OAuthConnection[]> {
    return this.connections.list(current.sub);
  }

  @Delete('oauth/connections/:clientId')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desconectar una aplicación: revoca todos sus tokens.',
  })
  async disconnect(
    @CurrentUser() current: AccessTokenPayload,
    @Param('clientId') clientId: string,
  ): Promise<void> {
    await this.connections.revoke(current.sub, clientId);
  }
}
