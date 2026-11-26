import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { StorageModule } from '../storage/storage.module';
import { OTA_BUNDLE_REPOSITORY } from './application/ports/ota-bundle-repository.port';
import { OtaUseCases } from './application/use-cases/ota.use-cases';
import { AdminOtaController } from './infrastructure/http/admin-ota.controller';
import { OtaUpdatesController } from './infrastructure/http/ota-updates.controller';
import { PrismaOtaBundleRepository } from './infrastructure/persistence/prisma-ota-bundle.repository';
import { OtaPurgeScheduler } from './infrastructure/scheduler/ota-purge.scheduler';

/**
 * Actualizaciones en caliente (OTA) de las apps móviles: la web de la app se
 * sube cifrada al storage (R2) y el plugin de la app se la baja sin pasar por
 * la tienda. Los zips viejos se borran solos (`OTA_KEEP_BUNDLES`).
 */
@Module({
  imports: [IamModule, StorageModule],
  controllers: [OtaUpdatesController, AdminOtaController],
  providers: [
    { provide: OTA_BUNDLE_REPOSITORY, useClass: PrismaOtaBundleRepository },
    OtaUseCases,
    OtaPurgeScheduler,
  ],
})
export class OtaModule {}
