import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type PermissionLevel } from '../../../domain/entities/permission-level';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  PermissionGuard,
  REQUIRES_PERMISSION_KEY,
} from '../guards/permission.guard';

// Usado en controllers/handlers para proteger endpoints. Pasa la auth y la
// comprobación de permiso en cadena (JwtAuthGuard primero deja `req.user`,
// PermissionGuard chequea contra el resolver).
//
//   @Get(':id')
//   @RequiresPermission('users', 'READ')
//   findOne(...) { ... }
export function RequiresPermission(section: string, level: PermissionLevel) {
  return applyDecorators(
    SetMetadata(REQUIRES_PERMISSION_KEY, { section, level }),
    UseGuards(JwtAuthGuard, PermissionGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Token inválido o ausente.' }),
    ApiForbiddenResponse({
      description: `Falta permiso ${level} sobre "${section}".`,
    }),
  );
}
