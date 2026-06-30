import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, DiscoveryModule } from '@nestjs/core';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { IamModule } from './modules/iam/iam.module';
import { SectionsModule } from './modules/sections/sections.module';
import { StorageModule } from './modules/storage/storage.module';
import { BlogModule } from './modules/blog/blog.module';
import { DynamicFormsModule } from './modules/dynamic-forms/dynamic-forms.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
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
    // Necesario para el script `sync:sections`, que recorre los handlers
    // buscando metadatos `@RequiresPermission`. Pesa cero en runtime.
    DiscoveryModule,
    PrismaModule,
    IamModule,
    SectionsModule,
    StorageModule,
    BlogModule,
    DynamicFormsModule,
    WorkflowsModule,
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
