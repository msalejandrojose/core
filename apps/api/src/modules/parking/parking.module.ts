import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { StorageModule } from '../storage/storage.module';
import { HOST_VERIFICATION_REPOSITORY } from './application/ports/host-verification-repository.port';
import { PARKING_REPOSITORY } from './application/ports/parking-repository.port';
import { PARKING_PRICE_OVERRIDE_REPOSITORY } from './application/ports/parking-price-override-repository.port';
import { PAYMENT_REPOSITORY } from './application/ports/payment-repository.port';
import { RESERVATION_REPOSITORY } from './application/ports/reservation-repository.port';
import { REVIEW_REPOSITORY } from './application/ports/review-repository.port';
import { AddParkingPhotoUseCase } from './application/use-cases/add-parking-photo.use-case';
import { AddParkingPriceOverrideUseCase } from './application/use-cases/add-parking-price-override.use-case';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case';
import { ConfirmReservationUseCase } from './application/use-cases/confirm-reservation.use-case';
import { CreateParkingUseCase } from './application/use-cases/create-parking.use-case';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case';
import { CreateReservationCheckoutUseCase } from './application/use-cases/create-reservation-checkout.use-case';
import { CreateReviewUseCase } from './application/use-cases/create-review.use-case';
import { GetAnyParkingUseCase } from './application/use-cases/get-any-parking.use-case';
import { GetMyHostVerificationUseCase } from './application/use-cases/get-my-host-verification.use-case';
import { GetParkingUseCase } from './application/use-cases/get-parking.use-case';
import { GetParkingPriceQuoteUseCase } from './application/use-cases/get-parking-price-quote.use-case';
import { GetPublicParkingUseCase } from './application/use-cases/get-public-parking.use-case';
import { GetReservationUseCase } from './application/use-cases/get-reservation.use-case';
import { GetReservationPaymentUseCase } from './application/use-cases/get-reservation-payment.use-case';
import { HandlePaymentWebhookUseCase } from './application/use-cases/handle-payment-webhook.use-case';
import { ListAllParkingsUseCase } from './application/use-cases/list-all-parkings.use-case';
import { ListAllPaymentsUseCase } from './application/use-cases/list-all-payments.use-case';
import { ListAllReservationsUseCase } from './application/use-cases/list-all-reservations.use-case';
import { ListAllReviewsUseCase } from './application/use-cases/list-all-reviews.use-case';
import { ListHostReservationsUseCase } from './application/use-cases/list-host-reservations.use-case';
import { ListHostVerificationsUseCase } from './application/use-cases/list-host-verifications.use-case';
import { ListMyParkingsUseCase } from './application/use-cases/list-my-parkings.use-case';
import { ListMyReservationsUseCase } from './application/use-cases/list-my-reservations.use-case';
import { ListParkingPriceOverridesUseCase } from './application/use-cases/list-parking-price-overrides.use-case';
import { ListParkingReviewsUseCase } from './application/use-cases/list-parking-reviews.use-case';
import { ListReservationReviewsUseCase } from './application/use-cases/list-reservation-reviews.use-case';
import { ModerateDeleteReviewUseCase } from './application/use-cases/moderate-delete-review.use-case';
import { ModerateUnpublishParkingUseCase } from './application/use-cases/moderate-unpublish-parking.use-case';
import { PublishParkingUseCase } from './application/use-cases/publish-parking.use-case';
import { ReleaseHostPayoutUseCase } from './application/use-cases/release-host-payout.use-case';
import { RemoveParkingPhotoUseCase } from './application/use-cases/remove-parking-photo.use-case';
import { RemoveParkingPriceOverrideUseCase } from './application/use-cases/remove-parking-price-override.use-case';
import { ReviewHostVerificationUseCase } from './application/use-cases/review-host-verification.use-case';
import { SearchPublicParkingsUseCase } from './application/use-cases/search-public-parkings.use-case';
import { SubmitHostVerificationUseCase } from './application/use-cases/submit-host-verification.use-case';
import { UnpublishParkingUseCase } from './application/use-cases/unpublish-parking.use-case';
import { UnverifyParkingUseCase } from './application/use-cases/unverify-parking.use-case';
import { UpdateParkingUseCase } from './application/use-cases/update-parking.use-case';
import { VerifyParkingUseCase } from './application/use-cases/verify-parking.use-case';
import { PrismaHostVerificationRepository } from './infrastructure/persistence/prisma-host-verification.repository';
import { PrismaParkingRepository } from './infrastructure/persistence/prisma-parking.repository';
import { PrismaParkingPriceOverrideRepository } from './infrastructure/persistence/prisma-parking-price-override.repository';
import { PrismaPaymentRepository } from './infrastructure/persistence/prisma-payment.repository';
import { PrismaReservationRepository } from './infrastructure/persistence/prisma-reservation.repository';
import { PrismaReviewRepository } from './infrastructure/persistence/prisma-review.repository';
import { AdminHostVerificationsController } from './infrastructure/http/admin-host-verifications.controller';
import { AdminParkingsController } from './infrastructure/http/admin-parkings.controller';
import { MyHostVerificationController } from './infrastructure/http/my-host-verification.controller';
import { ParkingsController } from './infrastructure/http/parkings.controller';
import { PublicParkingsController } from './infrastructure/http/public-parkings.controller';
import { ReservationsController } from './infrastructure/http/reservations.controller';
import { StripeWebhookController } from './infrastructure/http/stripe-webhook.controller';

@Module({
  imports: [IamModule, StorageModule, NotificationsModule, PaymentsModule],
  controllers: [
    ParkingsController,
    ReservationsController,
    PublicParkingsController,
    AdminParkingsController,
    MyHostVerificationController,
    AdminHostVerificationsController,
    StripeWebhookController,
  ],
  providers: [
    { provide: PARKING_REPOSITORY, useClass: PrismaParkingRepository },
    { provide: RESERVATION_REPOSITORY, useClass: PrismaReservationRepository },
    {
      provide: HOST_VERIFICATION_REPOSITORY,
      useClass: PrismaHostVerificationRepository,
    },
    {
      provide: PARKING_PRICE_OVERRIDE_REPOSITORY,
      useClass: PrismaParkingPriceOverrideRepository,
    },
    { provide: PAYMENT_REPOSITORY, useClass: PrismaPaymentRepository },
    { provide: REVIEW_REPOSITORY, useClass: PrismaReviewRepository },

    // Use cases — plazas
    CreateParkingUseCase,
    UpdateParkingUseCase,
    GetParkingUseCase,
    ListMyParkingsUseCase,
    PublishParkingUseCase,
    UnpublishParkingUseCase,
    AddParkingPhotoUseCase,
    RemoveParkingPhotoUseCase,

    // Use cases — precios dinámicos por fecha (TASK-146)
    AddParkingPriceOverrideUseCase,
    RemoveParkingPriceOverrideUseCase,
    ListParkingPriceOverridesUseCase,
    GetParkingPriceQuoteUseCase,

    // Use cases — reservas
    CreateReservationUseCase,
    GetReservationUseCase,
    ListMyReservationsUseCase,
    ListHostReservationsUseCase,
    ConfirmReservationUseCase,
    CancelReservationUseCase,

    // Use cases — pagos (Stripe Checkout + comisión de marketplace, TASK-153)
    CreateReservationCheckoutUseCase,
    GetReservationPaymentUseCase,
    HandlePaymentWebhookUseCase,
    ListAllPaymentsUseCase,
    ReleaseHostPayoutUseCase,

    // Use cases — reseñas bidireccionales tras la estancia (TASK-154)
    CreateReviewUseCase,
    ListReservationReviewsUseCase,
    ListParkingReviewsUseCase,
    ListAllReviewsUseCase,
    ModerateDeleteReviewUseCase,

    // Use cases — buscador público (landing web, TASK-147: ubicación + fechas)
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
