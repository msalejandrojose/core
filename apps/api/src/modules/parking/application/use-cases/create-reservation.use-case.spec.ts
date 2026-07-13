import { CreateReservationUseCase } from './create-reservation.use-case';
import { ParkingNotBookableError } from '../../domain/errors/parking-not-bookable.error';
import { ParkingNotAvailableError } from '../../domain/errors/parking-not-available.error';

describe('CreateReservationUseCase', () => {
  let parkings: { findById: jest.Mock };
  let reservations: { hasOverlap: jest.Mock; create: jest.Mock };
  let priceOverrides: { listOverlapping: jest.Mock };
  let users: { findById: jest.Mock };
  let sendNotification: { executeByKey: jest.Mock };
  let useCase: CreateReservationUseCase;

  const parking = {
    id: 'parking-1',
    hostUserId: 'host-1',
    title: 'Plaza céntrica',
    status: 'PUBLISHED',
    pricePerDay: 20,
  };
  const reservation = {
    id: 'res-1',
    parkingId: 'parking-1',
    guestUserId: 'guest-1',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-03'),
    totalAmount: 40,
    status: 'PENDING',
  };

  beforeEach(() => {
    parkings = { findById: jest.fn().mockResolvedValue(parking) };
    reservations = {
      hasOverlap: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue(reservation),
    };
    priceOverrides = { listOverlapping: jest.fn().mockResolvedValue([]) };
    users = {
      findById: jest.fn().mockResolvedValue({
        id: 'host-1',
        email: 'host@example.com',
      }),
    };
    sendNotification = { executeByKey: jest.fn().mockResolvedValue({}) };
    useCase = new CreateReservationUseCase(
      parkings as never,
      reservations as never,
      priceOverrides as never,
      users as never,
      sendNotification as never,
    );
  });

  it('crea la reserva y avisa al host por email', async () => {
    const result = await useCase.execute({
      parkingId: 'parking-1',
      guestUserId: 'guest-1',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-03'),
    });

    expect(result).toBe(reservation);
    expect(sendNotification.executeByKey).toHaveBeenCalledWith(
      'parking_reservation_requested',
      expect.objectContaining({ to: 'host@example.com' }),
    );
  });

  it('falla si la plaza no está publicada', async () => {
    parkings.findById.mockResolvedValue({ ...parking, status: 'DRAFT' });

    await expect(
      useCase.execute({
        parkingId: 'parking-1',
        guestUserId: 'guest-1',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-03'),
      }),
    ).rejects.toBeInstanceOf(ParkingNotBookableError);
  });

  it('falla si el rango se solapa con otra reserva/bloqueo', async () => {
    reservations.hasOverlap.mockResolvedValue(true);

    await expect(
      useCase.execute({
        parkingId: 'parking-1',
        guestUserId: 'guest-1',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-03'),
      }),
    ).rejects.toBeInstanceOf(ParkingNotAvailableError);
  });

  it('no revierte la reserva si el envío de la notificación falla', async () => {
    sendNotification.executeByKey.mockRejectedValue(new Error('smtp down'));

    const result = await useCase.execute({
      parkingId: 'parking-1',
      guestUserId: 'guest-1',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-03'),
    });

    expect(result).toBe(reservation);
    expect(reservations.create).toHaveBeenCalled();
  });
});
