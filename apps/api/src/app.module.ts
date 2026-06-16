import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { ErrorLogModule } from './infrastructure/error-log/error-log.module';
import { AppExceptionFilter } from './shared/filters/app-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Orden = prioridad: `.env` (secretos, gitignored) sobreescribe
      // los defaults de `.env.local` (committed).
      // En producción ninguno de los dos existirá dentro del contenedor;
      // las variables vendrán inyectadas por el proveedor cloud.
      envFilePath: ['.env', '.env.local'],
    }),
    PrismaModule,
    ErrorLogModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
  ],
})
export class AppModule {}
