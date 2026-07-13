import type { components } from '@core/api-client';
import { apiClient } from '@/api/client';
import type { CursorFetcher } from '@/components/list';

export type ParkingSummary = components['schemas']['PublicParkingSummaryResponseDto'];
export type ParkingPublic = components['schemas']['PublicParkingResponseDto'];
export type MyParking = components['schemas']['ParkingResponseDto'];
export type Reservation = components['schemas']['ReservationResponseDto'];
export type HostVerification = components['schemas']['HostVerificationResponseDto'];
export type ParkingStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type HostVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// Las fotos vienen como ruta relativa al mount `/v1` (`/files/view?token=...`).
export function resolvePhotoUrl(path: string): string {
  return `${import.meta.env.VITE_API_URL}/v1${path}`;
}

// --- Buscador público (huésped) ---

export interface SearchParams {
  q?: string;
  startDate?: string;
  endDate?: string;
}

export function searchParkingsFetcher(params: SearchParams): CursorFetcher<ParkingSummary> {
  return async ({ cursor, limit }) => {
    const { data, error } = await apiClient.GET('/parking/public/parkings', {
      params: {
        query: {
          q: params.q || undefined,
          startDate: params.startDate || undefined,
          endDate: params.endDate || undefined,
          limit,
          cursor: cursor ?? undefined,
        },
      },
    });
    if (error || !data) return null;
    return { data: data.data, meta: data.meta };
  };
}

export async function getPublicParking(id: string): Promise<ParkingPublic | null> {
  const { data, error } = await apiClient.GET('/parking/public/parkings/{id}', {
    params: { path: { id } },
  });
  return error || !data ? null : data;
}

// --- Reservas (huésped) ---

export interface CreateReservationInput {
  parkingId: string;
  startDate: string;
  endDate: string;
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<{ data: Reservation | null; errorMessage?: string }> {
  const { data, error } = await apiClient.POST('/me/reservations', { body: input });
  if (error || !data) {
    return { data: null, errorMessage: errorMessageOf(error) };
  }
  return { data };
}

export function myReservationsFetcher(status?: ReservationStatus): CursorFetcher<Reservation> {
  return async ({ cursor, limit }) => {
    const { data, error } = await apiClient.GET('/me/reservations', {
      params: { query: { status, limit, cursor: cursor ?? undefined } },
    });
    if (error || !data) return null;
    return { data: data.data, meta: data.meta };
  };
}

export async function getReservation(id: string): Promise<Reservation | null> {
  const { data, error } = await apiClient.GET('/me/reservations/{id}', {
    params: { path: { id } },
  });
  return error || !data ? null : data;
}

export async function cancelReservation(id: string): Promise<boolean> {
  const { error } = await apiClient.POST('/me/reservations/{id}/cancel', {
    params: { path: { id } },
  });
  return !error;
}

export async function confirmReservation(id: string): Promise<boolean> {
  const { error } = await apiClient.POST('/me/reservations/{id}/confirm', {
    params: { path: { id } },
  });
  return !error;
}

export function hostReservationsFetcher(opts: {
  status?: ReservationStatus;
  parkingId?: string;
}): CursorFetcher<Reservation> {
  return async ({ cursor, limit }) => {
    const { data, error } = await apiClient.GET('/me/reservations/hosting', {
      params: {
        query: {
          status: opts.status,
          parkingId: opts.parkingId,
          limit,
          cursor: cursor ?? undefined,
        },
      },
    });
    if (error || !data) return null;
    return { data: data.data, meta: data.meta };
  };
}

// --- Plazas (host) ---

export interface ParkingFormInput {
  title: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  pricePerDay: number;
  accessInstructions?: string;
}

export function myParkingsFetcher(status?: ParkingStatus): CursorFetcher<MyParking> {
  return async ({ cursor, limit }) => {
    const { data, error } = await apiClient.GET('/me/parkings', {
      params: { query: { status, limit, cursor: cursor ?? undefined } },
    });
    if (error || !data) return null;
    return { data: data.data, meta: data.meta };
  };
}

export async function getMyParking(id: string): Promise<MyParking | null> {
  const { data, error } = await apiClient.GET('/me/parkings/{id}', {
    params: { path: { id } },
  });
  return error || !data ? null : data;
}

export async function createParking(
  input: ParkingFormInput,
): Promise<{ data: MyParking | null; errorMessage?: string }> {
  const { data, error } = await apiClient.POST('/me/parkings', { body: input });
  if (error || !data) return { data: null, errorMessage: errorMessageOf(error) };
  return { data };
}

export async function updateParking(
  id: string,
  input: Partial<ParkingFormInput>,
): Promise<{ data: MyParking | null; errorMessage?: string }> {
  const { data, error } = await apiClient.PATCH('/me/parkings/{id}', {
    params: { path: { id } },
    body: input,
  });
  if (error || !data) return { data: null, errorMessage: errorMessageOf(error) };
  return { data };
}

export async function publishParking(id: string): Promise<MyParking | null> {
  const { data, error } = await apiClient.POST('/me/parkings/{id}/publish', {
    params: { path: { id } },
  });
  return error || !data ? null : data;
}

export async function unpublishParking(id: string): Promise<MyParking | null> {
  const { data, error } = await apiClient.POST('/me/parkings/{id}/unpublish', {
    params: { path: { id } },
  });
  return error || !data ? null : data;
}

export async function addParkingPhoto(
  parkingId: string,
  storedFileId: string,
): Promise<MyParking | null> {
  const { data, error } = await apiClient.POST('/me/parkings/{id}/photos', {
    params: { path: { id: parkingId } },
    body: { storedFileId },
  });
  return error || !data ? null : data;
}

export async function removeParkingPhoto(
  parkingId: string,
  photoId: string,
): Promise<MyParking | null> {
  const { data, error } = await apiClient.DELETE('/me/parkings/{id}/photos/{photoId}', {
    params: { path: { id: parkingId, photoId } },
  });
  return error || !data ? null : data;
}

// --- Verificación de host / KYC básico (TASK-155) ---

export async function getMyHostVerification(): Promise<HostVerification | null> {
  const { data, error } = await apiClient.GET('/me/host-verification');
  return error || !data ? null : data;
}

export async function submitHostVerification(input: {
  legalName: string;
  documentFileId: string;
}): Promise<{ data: HostVerification | null; errorMessage?: string }> {
  const { data, error } = await apiClient.POST('/me/host-verification', { body: input });
  if (error || !data) return { data: null, errorMessage: errorMessageOf(error) };
  return { data };
}

// El filtro global de la API responde `{ code, message, statusCode, ... }`.
function errorMessageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Ha ocurrido un error inesperado.';
}
