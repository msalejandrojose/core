import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OtaUseCases } from '../../application/use-cases/ota.use-cases';

/**
 * Limpieza diaria de zips viejos de todas las apps. Es el respaldo: lo normal
 * es que se limpien al subir una nueva (con Cloud Run escalando a cero, el cron
 * solo corre si hay una instancia despierta a esa hora).
 */
@Injectable()
export class OtaPurgeScheduler {
  private readonly logger = new Logger(OtaPurgeScheduler.name);

  constructor(private readonly ota: OtaUseCases) {}

  @Cron('17 4 * * *', { name: 'ota-purge' })
  async run(): Promise<void> {
    try {
      const n = await this.ota.purge();
      if (n) this.logger.log(`Zips OTA borrados: ${n}`);
    } catch (e) {
      this.logger.error(`Limpieza OTA fallida: ${String(e)}`);
    }
  }
}
