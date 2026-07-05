import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

// TerminusModule provee (y exporta) `HealthCheckService` y los indicadores,
// incluido `PrismaHealthIndicator`. `PrismaService` es global (@Global en
// PrismaModule), así que no hace falta importar nada más.
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
