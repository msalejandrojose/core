import { SetMetadata } from '@nestjs/common';

// Marca un endpoint como público (no requiere autenticación).
// JwtAuthGuard se aplica globalmente como `APP_GUARD`, así que por defecto
// TODA la API es privada. Usa `@Public()` SOLO en endpoints expuestos a
// internet sin login (login, register, recuperación de password, health…).
//
// Aplicable a handler o controller. Si lo pones a nivel de controller, todos
// sus métodos se vuelven públicos salvo que algún método lo "anule" con un
// guard explícito.
export const IS_PUBLIC_KEY = 'iam:isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
