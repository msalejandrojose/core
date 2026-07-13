import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { StorageModule } from '../storage/storage.module';
import { HOST_VERIFICATION_REPOSITORY } from './application/ports/host-verification-repository.port';
import { PARKING_REPOSITORY } from './application/ports/parking-repository.port';
import { RESERVATION_REPOSITORY } from './application/ports/reservation-repository.port';
import { AddParkingPhotoUseCase } from './application/use-cases/add-parking-photo.use-case';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case';
import { ConfirmReservationUseCase } from './application/use-cases/confirm-reservation.use-case';
import { CreateParkingUseCase } from './application/use-cases/create-parking.use-case';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case';
import { GetAnyParkingUseCase } from './application/use-cases/get-any-parking.use-case';
import { GetMyHostVerificationUseCase } from './application/use-cases/get-my-host-verification.use-case';
import { GetParkingUseCase } from './application/use-cases/get-parking.use-case';
import { GetPublicParkingUseCase } from './application/use-cases/get-public-parking.use-case';
import { GetReservationUseCase } from './application/use-cases/get-reservation.use-case';
import { ListAllParkingsUseCase } from './application/use-cases/list-all-parkings.use-case';
import { ListAllReservationsUseCase } from './application/use-cases/list-all-reservations.use-case';
import { ListHostReservationsUseCase } from './application/use-cases/list-host-reservations.use-case';
import { ListHostVerificationsUseCase } from './application/use-cases/list-host-verifications.use-case';
import { ListMyParkingsUseCase } from './application/use-cases/list-my-parkings.use-case';
import { ListMyReservationsUseCase } from './application/use-cases/list-my-reservations.use-case';
import { ModerateUnpublishParkingUseCase } from './application/use-cases/moderate-unpublish-parking.use-case';
import { PublishParkingUseCase } from './application/use-cases/publish-parking.use-case';
import { RemoveParkingPhotoUseCase } from './application/use-cases/remove-parking-photo.use-case';
import { ReviewHostVerificationUseCase } from './application/use-cases/review-host-verification.use-case';
import { SearchPublicParkingsUseCase } from './application/use-cases/search-public-parkings.use-case';
import { SubmitHostVerificationUseCase } from './application/use-cases/submit-host-verification.use-case';
import { UnpublishParkingUseCase } from './application/use-cases/unpublish-parking.use-case';
import { UnverifyParkingUseCase } from './application/use-cases/unverify-parking.use-case';
import { UpdateParkingUseCase } from './application/use-cases/update-parking.use-case';
import { VerifyParkingUseCase } from './application/use-cases/verify-parking.use-case';
import { PrismaHostVerificationRepository } from './infrastructure/persistence/prisma-host-verification.repository';
import { PrismaParkingRepository } from './infrastructure/persistence/prisma-parking.repository';
import { PrismaReservationRepository } from './infrastructure/persistence/prisma-reservation.repository';
import { AdminHostVerificationsController } from './infrastructure/http/admin-host-verifications.controller';
import { AdminParkingsController } from './infrastructure/http/admin-parkings.controller';
import { MyHostVerificationController } from './infrastructure/http/my-host-verification.controller';
import { ParkingsController } from './infrastructure/http/parkings.controller';
import { PublicParkingsController } from './infrastructure/http/public-parkings.controller';
import { ReservationsController } from './infrastructure/http/reservations.controller';

@Module({
  imports: [IamModule, StorageModule],
  controllers: [
    ParkingsController,
    ReservationsController,
    PublicParkingsController,
    AdminParkingsController,
    MyHostVerificationController,
    AdminHostVerificationsController,
  ],
  providers: [
    { provide: PARKING_REPOSITORY, useClass: PrismaParkingRepository },
    { provide: RESERVATION_REPOSITORY, useClass: PrismaReservationRepository },
    {
      provide: HOST_VERIFICATION_REPOSITORY,
      useClass: PrismaHostVerificationRepository,
    },

    // Use cases — plazas
    CreateParkingUseCase,
    UpdateParkingUseCase,
    GetParkingUseCase,
    ListMyParkingsUseCase,
    PublishParkingUseCase,
    UnpublishParkingUseCase,
    AddParkingPhotoUseCase,
    RemoveParkingPhotoUseCase,

    // Use cases — reservas
    CreateReservationUseCase,
    GetReservationUseCase,
    ListMyReservationsUseCase,
    ListHostReservationsUseCase,
    ConfirmReservationUseCase,
    CancelReservationUseCase,

    // Use cases — buscador público (landing web)
    SearchPublicParkingsUseCase,
    GetPublicParkingUseCase,

    // Use cases — backoffice (moderación, TASK-152)
    ListAllParkingsUseCase,
    GetAnyParkingUseCase,
    ModerateUnpublishParkingUseCase,
    ListAllReservationsUseCase,

    // Use cases — verificación de plaza / KYC de host (TASK-155)
    SubmitHostVerificationUseCase,
    GetMyHostVerificationUseCase,
    ListHostVerificationsUseCase,
    ReviewHostVerificationUseCase,
    VerifyParkingUseCase,
    UnverifyParkingUseCase,
  ],
  // Se reexporta por si otro módulo futuro necesita consultar plazas o
  // reservas sin duplicar acceso a datos.
  exports: [PARKING_REPOSITORY, RESERVATION_REPOSITORY],
})
export class ParkingModule {}
