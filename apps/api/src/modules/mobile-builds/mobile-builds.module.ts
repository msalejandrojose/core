import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { BUILD_PIPELINE } from './application/ports/build-pipeline.port';
import { MobileBuildsUseCases } from './application/use-cases/mobile-builds.use-cases';
import { GithubActionsPipelineAdapter } from './infrastructure/github/github-actions-pipeline.adapter';
import { AdminMobileBuildsController } from './infrastructure/http/admin-mobile-builds.controller';

/**
 * Builds nativos de las apps móviles desde el backoffice. Compila el Mac Mini
 * con `.github/workflows/mobile-build.yml` (runner self-hosted); la API solo
 * lanza runs, los lee y da el enlace para bajar el resultado. No guarda nada:
 * lo que manda es GitHub Actions.
 */
@Module({
  imports: [IamModule],
  controllers: [AdminMobileBuildsController],
  providers: [
    { provide: BUILD_PIPELINE, useClass: GithubActionsPipelineAdapter },
    MobileBuildsUseCases,
  ],
})
export class MobileBuildsModule {}
