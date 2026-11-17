import { Injectable } from '@nestjs/common';
import {
  GarminApiError,
  type GarminClientPort,
} from '../../application/ports/garmin.port';
import type {
  GarminActivity,
  GarminDailySummary,
  GarminHrv,
  GarminSleep,
} from '../../domain/services/garmin';

const BASE = 'https://personal.connectapi.garmin.com';
const TIMEOUT_MS = 20_000;

/** Recorta la respuesta de Garmin y tapa cualquier cosa con pinta de token. */
const redact = (body: string) =>
  body
    .replace(/[A-Za-z0-9._~+/=-]{24,}/g, '<oculto>')
    .replace(/\s+/g, ' ')
    .slice(0, 300);

const asArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

/** Cliente HTTP de la Garmin Connect Personal API. */
@Injectable()
export class HttpGarminClient implements GarminClientPort {
  private async call<T>(
    path: string,
    authorization: string,
    method = 'GET',
    accept = 'application/json',
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: { authorization, accept },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new GarminApiError(0);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new GarminApiError(res.status, redact(body));
    }
    // Un día sin datos puede venir como 204 sin cuerpo.
    const text = await res.text();
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // El token puede venir como texto plano.
      return text as T;
    }
  }

  async accessToken(apiKey: string): Promise<string> {
    const r = await this.call<
      | string
      | { access_token?: string; accessToken?: string; token?: string }
      | undefined
    >(
      '/personalapitoken-service/personal-api/personal-api-key/token',
      `ApiKey ${apiKey}`,
      'POST',
      // El token llega como texto plano: pedir solo JSON da 406 (Not Acceptable).
      'application/json, text/plain, */*',
    );
    const token =
      typeof r === 'string'
        ? r.trim()
        : (r?.access_token ?? r?.accessToken ?? r?.token);
    if (!token)
      throw new GarminApiError(
        502,
        `respuesta sin token: ${typeof r === 'object' && r ? `campos ${Object.keys(r).join(', ')}` : typeof r}`,
      );
    return token;
  }

  async activities(
    token: string,
    query: { startDate: string; start: number; limit: number },
  ): Promise<GarminActivity[]> {
    const r = await this.call<unknown>(
      `/activitylist-service/activities/search/activities?startDate=${query.startDate}&start=${query.start}&limit=${query.limit}&sortBy=startLocal&sortOrder=asc`,
      `Bearer ${token}`,
    );
    return asArray<GarminActivity>(r);
  }

  async dailySummaries(
    token: string,
    from: string,
    to: string,
  ): Promise<GarminDailySummary[]> {
    const r = await this.call<{ data?: unknown } | undefined>(
      `/usersummary-service/v2/dailysummaries?startDate=${from}&endDate=${to}`,
      `Bearer ${token}`,
    );
    return asArray<GarminDailySummary>(r?.data);
  }

  async sleep(token: string, from: string, to: string): Promise<GarminSleep[]> {
    const r = await this.call<unknown>(
      `/sleep-service/sleep/dailySleepSummariesByDate?startDate=${from}&endDate=${to}`,
      `Bearer ${token}`,
    );
    return asArray<GarminSleep>(r);
  }

  async hrv(token: string, from: string, to: string): Promise<GarminHrv[]> {
    const r = await this.call<{ hrvSummaries?: unknown } | undefined>(
      `/hrv-service/hrv/daily/${from}/${to}`,
      `Bearer ${token}`,
    );
    return asArray<GarminHrv>(r?.hrvSummaries);
  }
}
