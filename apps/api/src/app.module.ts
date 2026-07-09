import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, DiscoveryModule } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { LoggerModule } from './infrastructure/logger/logger.module';
import { IamModule } from './modules/iam/iam.module';
import { SectionsModule } from './modules/sections/sections.module';
import { StorageModule } from './modules/storage/storage.module';
import { BlogModule } from './modules/blog/blog.module';
import { DynamicFormsModule } from './modules/dynamic-forms/dynamic-forms.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LeadsModule } from './modules/leads/leads.module';
import { GeoModule } from './modules/geo/geo.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UserNotificationsModule } from './modules/user-notifications/user-notifications.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ErrorLogModule } from './infrastructure/error-log/error-log.module';
import { HealthModule } from './infrastructure/health/health.module';
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
    // Scheduler (cron) del módulo de workflows.
    ScheduleModule.forRoot(),
    // Rate limiting global (in-memory). Ventana y tope configurables por env;
    // los endpoints públicos sensibles aprietan el límite con `@Throttle`, y
    // los probes de salud lo saltan con `@SkipThrottle`.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('THROTTLE_TTL_MS') ?? 60_000),
            limit: Number(config.get('THROTTLE_LIMIT') ?? 120),
          },
        ],
      }),
    }),
    LoggerModule,
    PrismaModule,
    IamModule,
    SectionsModule,
    StorageModule,
    BlogModule,
    DynamicFormsModule,
    WorkflowsModule,
    DashboardModule,
    LeadsModule,
    GeoModule,
    NotificationsModule,
    UserNotificationsModule,
    WhatsappModule,
    ErrorLogModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AppExceptionFilter,
    },
    // Guard global de rate limiting. Corre junto al JwtAuthGuard global.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
