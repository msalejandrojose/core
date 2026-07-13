// Keys de los `MessageType` que dispara este módulo (`notifications`, TASK-149).
// Registrados vía seed (`seeds/seed-parking-notifications.ts`) — si el
// `MessageType` no existe, `SendNotificationUseCase` lanza y el envío se
// omite (con warning), pero la reserva ya se ha creado/confirmado.
export const PARKING_RESERVATION_REQUESTED_MESSAGE_TYPE_KEY =
  'parking_reservation_requested';
export const PARKING_RESERVATION_CONFIRMED_MESSAGE_TYPE_KEY =
  'parking_reservation_confirmed';
