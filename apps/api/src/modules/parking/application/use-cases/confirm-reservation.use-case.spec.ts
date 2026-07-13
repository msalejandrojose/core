import { ConfirmReservationUseCase } from './confirm-reservation.use-case';
import { InvalidReservationStatusTransitionError } from '../../domain/errors/invalid-reservation-status-transition.error';

describe('ConfirmReservationUseCase', () => {
  let reservations: {
    findByIdForHost: jest.Mock;
    updateStatus: jest.Mock;
  };
  let parkings: { findById: jest.Mock };
  let users: { findById: jest.Mock };
  let sendNotification: { executeByKey: jest.Mock };
  let useCase: ConfirmReservationUseCase;

  const pending = {
    id: 'res-1',
    parkingId: 'parking-1',
    guestUserId: 'guest-1',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-03'),
    totalAmount: 40,
    status: 'PENDING',
  };
  const confirmed = { ...pending, status: 'CONFIRMED' };

  beforeEach(() => {
    reservations = {
      findByIdForHost: jest.fn().mockResolvedValue(pending),
      updateStatus: jest.fn().mockResolvedValue(confirmed),
    };
    parkings = {
      findById: jest.fn().mockResolvedValue({
        id: 'parking-1',
        title: 'Plaza céntrica',
        address: 'C/ Mayor 1',
      }),
    };
    users = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'guest-1', email: 'guest@example.com' }),
    };
    sendNotification = { executeByKey: jest.fn().mockResolvedValue({}) };
    useCase = new ConfirmReservationUseCase(
      reservations as never,
      parkings as never,
      users as never,
      sendNotification as never,
    );
  });

  it('confirma la reserva y avisa al huésped por email', async () => {
    const result = await useCase.execute('res-1', 'host-1');

    expect(result).toBe(confirmed);
    expect(reservations.updateStatus).toHaveBeenCalledWith(
      'res-1',
      'CONFIRMED',
    );
    expect(sendNotification.executeByKey).toHaveBeenCalledWith(
      'parking_reservation_confirmed',
      expect.objectContaining({ to: 'guest@example.com' }),
    );
  });

  it('falla si la reserva no está en un estado que permita confirmar', async () => {
    reservations.findByIdForHost.mockResolvedValue({
      ...pending,
      status: 'CANCELLED',
    });

    await expect(useCase.execute('res-1', 'host-1')).rejects.toBeInstanceOf(
      InvalidReservationStatusTransitionError,
    );
  });

  it('no revierte la confirmación si el envío de la notificación falla', async () => {
    sendNotification.executeByKey.mockRejectedValue(new Error('smtp down'));

    const result = await useCase.execute('res-1', 'host-1');

    expect(result).toBe(confirmed);
    expect(reservations.updateStatus).toHaveBeenCalled();
  });
});
