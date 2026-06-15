import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Como `JwtAuthGuard` se aplica globalmente (APP_GUARD), TODOS los endpoints
// son privados por defecto. `@Auth()` ya no añade el guard — solo añade
// la documentación de Swagger (botón Authorize + respuesta 401).
//
// Útil aplicado a nivel de controller en clases que NO tienen @Public() ni
// @RequiresPermission() en cada método. Para opt-out usa `@Public()`.
export function Auth(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Token inválido o ausente.' }),
  );
}
