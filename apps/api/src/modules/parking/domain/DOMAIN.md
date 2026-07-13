# Plazza — modelo de dominio (`parking`)

TASK-142, Fase 0. Diagrama de entidades y máquinas de estado antes de picar
el resto de las fases (TASK-145 Módulo Plazas, TASK-148 Módulo Reservas,
TASK-150/151/152 clientes).

## Entidades y relaciones

Reutiliza `User` (módulo `iam`), `PostalCode` (módulo `geo`) y `StoredFile`
(módulo `storage`) en vez de duplicarlos.

```mermaid
erDiagram
    User ||--o{ Parking : "host"
    User ||--o{ Reservation : "guest"
    PostalCode ||--o{ Parking : "ubicación"
    Parking ||--o{ ParkingPhoto : "fotos"
    StoredFile ||--|| ParkingPhoto : "archivo"
    Parking ||--o{ ParkingAvailabilityBlock : "bloqueos del host"
    Parking ||--o{ ParkingPriceOverride : "precios especiales"
    Parking ||--o{ Reservation : "reservas"
    Reservation ||--o| Payment : "cobro"
    Reservation ||--o{ Review : "reseñas"
    User ||--o{ Review : "autor"

    Parking {
        string id PK
        string hostUserId FK
        string title
        string address
        decimal latitude
        decimal longitude
        string postalCodeId FK "nullable"
        decimal pricePerDay
        ParkingStatus status
    }
    ParkingPhoto {
        string id PK
        string parkingId FK
        string storedFileId FK "unique"
        int position
    }
    ParkingAvailabilityBlock {
        string id PK
        string parkingId FK
        date startDate
        date endDate
        string reason "nullable"
    }
    ParkingPriceOverride {
        string id PK
        string parkingId FK
        date startDate
        date endDate
        decimal pricePerDay
        string label "nullable"
    }
    Reservation {
        string id PK
        string parkingId FK
        string guestUserId FK
        date startDate
        date endDate
        decimal totalAmount
        ReservationStatus status
    }
    Payment {
        string id PK
        string reservationId FK "unique"
        PaymentStatus status
        decimal amount
        decimal platformFeeAmount
        decimal hostPayoutAmount
        HostPayoutStatus hostPayoutStatus
        string providerCheckoutSessionId "unique, nullable"
    }
    Review {
        string id PK
        string reservationId FK
        string authorUserId FK
        ReviewAuthorRole authorRole "GUEST | HOST"
        int rating "1-5"
        string comment "nullable"
    }
```

### Notas de diseño

- **Disponibilidad no es una tabla de "días disponibles"**: una plaza está
  disponible en un rango de fechas si ese rango no se solapa con ningún
  `ParkingAvailabilityBlock` (bloqueo manual del host) **ni** con ninguna
  `Reservation` en estado `PENDING`/`CONFIRMED` (`ACTIVE_RESERVATION_STATUSES`
  en `@core/shared-types`). Evita mantener una fila por día.
- **`ParkingPhoto` es 1-1 con `StoredFile`** (`storedFileId` único): cada
  archivo subido vía el módulo `storage` se usa como foto de una única plaza.
  `position` ordena la galería.
- **`postalCodeId` es opcional**: la plaza siempre lleva `address` +
  `latitude`/`longitude` en texto/coordenadas libres (necesarias para el mapa
  y el buscador de proximidad); `postalCodeId` engancha con la jerarquía de
  `geo` solo para SEO local y agregaciones administrativas.
- **`ParkingPriceOverride` sustituye el precio para las noches que cubre**
  (TASK-146): el cálculo del importe de una reserva recorre noche a noche y
  usa el override cuya fecha la cubra (el más reciente si hay varios
  solapados) o el `pricePerDay` base si no hay ninguno. Vive en
  `domain/pricing.ts` (`calculateReservationTotal`), reutilizado por
  `CreateReservationUseCase` y por `GetParkingPriceQuoteUseCase` (quote
  público sin crear reserva, para el buscador).
- **`Payment` es 1-1 con `Reservation`** (TASK-153): una reserva se paga una
  vez; para cambiar el importe se cancela y se reserva de nuevo en vez de
  editar un pago. `amount` es una copia congelada de `totalAmount` en el
  momento del checkout. El cobro se hace vía **Stripe Checkout** (puerto
  `PaymentGatewayPort` en el módulo genérico `payments`, con
  `NullPaymentGatewayAdapter` si no hay `STRIPE_SECRET_KEY` — mismo patrón que
  `MailerPort`/`ResendMailerAdapter`/`NullMailerAdapter`); el webhook de
  Stripe es quien confirma el cobro (`HandlePaymentWebhookUseCase`), no la
  API en el momento de crear el checkout.
- **`platformFeeAmount`/`hostPayoutAmount`** se calculan con
  `calculateCommissionSplit` (`domain/commission.ts`, `PLAZZA_PLATFORM_FEE_PERCENT`,
  10% por defecto) al crear el checkout. **`hostPayoutStatus` es un registro
  manual**, no una transferencia real: no hay integración de Stripe Connect
  (requeriría onboarding bancario del host, fuera de alcance) — un admin lo
  marca `RELEASED` desde el backoffice cuando liquida al host por fuera del
  sistema.
- El pago **no transiciona el estado de la reserva**: confirmar una reserva
  (`Reservation.status: PENDING → CONFIRMED`) sigue siendo una acción
  explícita del host, independiente de si ya se cobró. Unificar ambos flujos
  es una decisión de producto para una iteración futura.
- **`Review` es bidireccional** (TASK-154): como mucho una por
  `(reservationId, authorRole)` — el guest reseña la plaza/host, el host
  reseña al guest, cada uno una vez. Solo reseñable si la reserva está
  `CONFIRMED` y `endDate` ya pasó (`domain/review-eligibility.ts`,
  `isReservationReviewable` — mismo criterio de "completada por cálculo" que
  el resto del dominio). La media de reseñas `GUEST` de una plaza
  (`ReviewRepositoryPort.getParkingRatingSummary`) se expone en el buscador y
  la ficha públicos como señal de confianza del marketplace; las reseñas
  `HOST` (sobre el guest) no tienen todavía una superficie propia en ningún
  cliente — quedan disponibles vía API para una futura pantalla de perfil de
  guest.
- Los enums y las funciones de transición (`canTransitionParkingStatus`,
  `canTransitionReservationStatus`, `blocksAvailability`) viven en
  `@core/shared-types` (`src/parking/parking.ts`), igual que el pipeline de
  `leads` — una única fuente de verdad consumida por backend y frontends.

## Máquina de estados — `Parking.status`

```mermaid
stateDiagram-v2
    [*] --> DRAFT: host crea la plaza
    DRAFT --> PUBLISHED: publicar (TASK-145)
    PUBLISHED --> UNPUBLISHED: despublicar
    UNPUBLISHED --> PUBLISHED: republicar
```

`DRAFT` es solo el punto de partida (mientras el host completa dirección,
fotos, precio); no se vuelve a él. Solo una plaza `PUBLISHED` es visible y
reservable (`isBookableParkingStatus`).

## Máquina de estados — `Reservation.status`

```mermaid
stateDiagram-v2
    [*] --> PENDING: guest reserva
    PENDING --> CONFIRMED: confirmación (pago, Fase 1)
    PENDING --> CANCELLED
    CONFIRMED --> CANCELLED
    CANCELLED --> [*]
```

No hay estado `COMPLETED`: una reserva `CONFIRMED` cuyo `endDate` ya pasó se
considera completada por cálculo (`endDate < now()`), no por un estado propio
— evita un job que recorra reservas para cerrarlas.

## Qué queda para las siguientes fases

- **TASK-145** (Módulo Plazas): use-cases `CreateParking`, `UpdateParking`,
  `PublishParking`, `UnpublishParking`; repositorio Prisma; subida de fotos
  contra `storage`.
- **TASK-148** (Módulo Reservas): use-case `CreateReservation` con el cálculo
  de `totalAmount` (`pricePerDay × días`) y la validación de anti-solape
  descrita arriba; transiciones de `Reservation.status`.
- **TASK-155** (Verificación/KYC): probablemente un campo/tabla adicional
  sobre `User` o `Parking`, fuera de alcance de este modelo base.
