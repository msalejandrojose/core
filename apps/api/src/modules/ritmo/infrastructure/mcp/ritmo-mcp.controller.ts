import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { VerifyOAuthAccessTokenUseCase } from '../../../iam/application/use-cases/oauth.use-cases';
import { OAuthError } from '../../../iam/domain/errors/oauth.error';
import { OAUTH_SCOPES } from '../../../iam/domain/services/oauth';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { publicBaseUrl } from '../../../iam/infrastructure/http/oauth-urls';
import {
  CompletePlannedDayUseCase,
  GetPlanWeekUseCase,
  SetPlannedDayUseCase,
} from '../../application/use-cases/plan.use-cases';
import { buildRitmoMcpServer } from './ritmo-mcp.server';

const MCP_PATH = '/v1/ritmo/mcp';
const SCOPE = 'ritmo';

/**
 * Conector MCP de Brío (Streamable HTTP, sin estado): `POST /v1/ritmo/mcp`.
 * Público para el guard JWT de la app: se autentica con tokens OAuth de IAM
 * (scope `ritmo`). Sin token válido responde 401 con `WWW-Authenticate`
 * apuntando a los metadatos del recurso (RFC 9728), que es lo que usa el
 * cliente MCP para descubrir dónde autorizarse.
 */
@ApiTags('ritmo')
@Controller()
export class RitmoMcpController {
  constructor(
    private readonly verify: VerifyOAuthAccessTokenUseCase,
    private readonly getWeek: GetPlanWeekUseCase,
    private readonly setDay: SetPlannedDayUseCase,
    private readonly completeDay: CompletePlannedDayUseCase,
  ) {}

  /** RFC 9728 (en la raíz y con el path del recurso). Fuera del prefijo `/v1` (main.ts). */
  @Get([
    '.well-known/oauth-protected-resource',
    '.well-known/oauth-protected-resource/v1/ritmo/mcp',
  ])
  @Public()
  @ApiExcludeEndpoint()
  resourceMetadata(@Req() req: Request) {
    const base = publicBaseUrl(req);
    return {
      resource: `${base}${MCP_PATH}`,
      authorization_servers: [base],
      scopes_supported: Object.keys(OAUTH_SCOPES),
      bearer_methods_supported: ['header'],
      resource_name: 'Brío · plan de entreno',
    };
  }

  @All('ritmo/mcp')
  @Public()
  // Fuera de Swagger: `@All` saldría 8 veces y no es una API REST (es JSON-RPC
  // sobre Streamable HTTP; se describe con los metadatos MCP).
  @ApiExcludeEndpoint()
  async mcp(@Req() req: Request, @Res() res: Response): Promise<void> {
    const base = publicBaseUrl(req);
    const challenge = (error?: string, description?: string) =>
      [
        `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource${MCP_PATH}"`,
        `scope="${SCOPE}"`,
        error ? `error="${error}"` : null,
        description
          ? `error_description="${description.replace(/"/g, "'")}"`
          : null,
      ]
        .filter(Boolean)
        .join(', ');

    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) {
      res.setHeader('WWW-Authenticate', challenge());
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Falta el token de acceso.',
      });
      return;
    }
    let userId: string;
    try {
      userId = (await this.verify.execute(token, SCOPE, `${base}${MCP_PATH}`))
        .userId;
    } catch (e) {
      if (e instanceof OAuthError) {
        res.setHeader(
          'WWW-Authenticate',
          challenge(
            e.status === 403 ? 'insufficient_scope' : 'invalid_token',
            e.description,
          ),
        );
        res
          .status(e.status)
          .json({ error: e.code, error_description: e.description });
        return;
      }
      throw e;
    }

    // Sin estado: ni sesiones ni stream de servidor. GET (SSE) y DELETE no aplican.
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Método no permitido: usa POST.' },
        id: null,
      });
      return;
    }

    const server = buildRitmoMcpServer(userId, {
      getWeek: this.getWeek,
      setDay: this.setDay,
      completeDay: this.completeDay,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
