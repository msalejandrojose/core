import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type PermissionLevel } from '../../../domain/entities/permission-level';
import { ResolvePermissionUseCase } from '../../../application/use-cases/resolve-permission.use-case';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { type AuthenticatedRequest } from './jwt-auth.guard';

export const REQUIRES_PERMISSION_KEY = 'iam:requiresPermission';

export interface RequiresPermissionMeta {
  section: string;
  level: PermissionLevel;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolve: ResolvePermissionUseCase,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // Si el endpoint está marcado como público, no chequea permisos.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const meta = this.reflector.getAllAndOverride<RequiresPermissionMeta | undefined>(
      REQUIRES_PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!meta) return true;

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) {
      throw new UnauthorizedException();
    }

    const allowed = await this.resolve.isAllowed(req.user.sub, meta.section, meta.level);
    if (!allowed) {
      throw new ForbiddenException(
        `Falta permiso ${meta.level} sobre "${meta.section}".`,
      );
    }
    return true;
  }
}
