import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { IamModule } from './modules/iam/iam.module';
import { StorageModule } from './modules/storage/storage.module';

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
    // Necesario para el script `sync:sections`, que recorre los handlers
    // buscando metadatos `@RequiresPermission`. Pesa cero en runtime.
    DiscoveryModule,
    PrismaModule,
    IamModule,
    StorageModule,
  ],
})
export class AppModule {}
