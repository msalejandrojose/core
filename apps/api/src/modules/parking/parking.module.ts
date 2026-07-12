import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { StorageModule } from '../storage/storage.module';
import { PARKING_REPOSITORY } from './application/ports/parking-repository.port';
import { AddParkingPhotoUseCase } from './application/use-cases/add-parking-photo.use-case';
import { CreateParkingUseCase } from './application/use-cases/create-parking.use-case';
import { GetParkingUseCase } from './application/use-cases/get-parking.use-case';
import { ListMyParkingsUseCase } from './application/use-cases/list-my-parkings.use-case';
import { PublishParkingUseCase } from './application/use-cases/publish-parking.use-case';
import { RemoveParkingPhotoUseCase } from './application/use-cases/remove-parking-photo.use-case';
import { UnpublishParkingUseCase } from './application/use-cases/unpublish-parking.use-case';
import { UpdateParkingUseCase } from './application/use-cases/update-parking.use-case';
import { PrismaParkingRepository } from './infrastructure/persistence/prisma-parking.repository';
import { ParkingsController } from './infrastructure/http/parkings.controller';

@Module({
  imports: [IamModule, StorageModule],
  controllers: [ParkingsController],
  providers: [
    { provide: PARKING_REPOSITORY, useClass: PrismaParkingRepository },

    CreateParkingUseCase,
    UpdateParkingUseCase,
    GetParkingUseCase,
    ListMyParkingsUseCase,
    PublishParkingUseCase,
    UnpublishParkingUseCase,
    AddParkingPhotoUseCase,
    RemoveParkingPhotoUseCase,
  ],
  // PARKING_REPOSITORY se reexporta para que el módulo de reservas (TASK-148)
  // pueda comprobar que una plaza existe y está publicada sin duplicar acceso a datos.
  exports: [PARKING_REPOSITORY],
})
export class ParkingModule {}
