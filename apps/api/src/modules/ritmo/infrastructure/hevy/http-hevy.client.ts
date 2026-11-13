import { Injectable } from '@nestjs/common';
import {
  HevyApiError,
  type HevyClientPort,
  type HevyEvent,
  type Page,
} from '../../application/ports/hevy.port';
import type {
  HevyTemplate,
  HevyWorkout,
  RoutineExercise,
} from '../../domain/services/hevy';

const BASE = 'https://api.hevyapp.com';
const TIMEOUT_MS = 15_000;

/** Cliente HTTP de la API pública de Hevy. La clave viaja solo en la cabecera `api-key`. */
@Injectable()
export class HttpHevyClient implements HevyClientPort {
  private async call<T>(
    apiKey: string,
    path: string,
    init?: { method: string; body: unknown },
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        method: init?.method ?? 'GET',
        headers: {
          'api-key': apiKey,
          accept: 'application/json',
          ...(init ? { 'content-type': 'application/json' } : {}),
        },
        body: init ? JSON.stringify(init.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new HevyApiError(0);
    }
    if (!res.ok) throw new HevyApiError(res.status);
    return (await res.json()) as T;
  }

  async userInfo(apiKey: string): Promise<{ username: string }> {
    const r = await this.call<{ data?: { username?: string; name?: string } }>(
      apiKey,
      '/v1/user/info',
    );
    return { username: r.data?.username ?? r.data?.name ?? '' };
  }

  async workouts(apiKey: string, page: number): Promise<Page<HevyWorkout>> {
    const r = await this.call<{ page_count: number; workouts?: HevyWorkout[] }>(
      apiKey,
      `/v1/workouts?page=${page}&pageSize=10`,
    );
    return { pageCount: r.page_count ?? 1, items: r.workouts ?? [] };
  }

  async workoutEvents(
    apiKey: string,
    since: Date,
    page: number,
  ): Promise<Page<HevyEvent>> {
    const r = await this.call<{
      page_count: number;
      events?: { type: string; id?: string; workout?: HevyWorkout }[];
    }>(
      apiKey,
      `/v1/workouts/events?page=${page}&pageSize=10&since=${encodeURIComponent(since.toISOString())}`,
    );
    const items: HevyEvent[] = [];
    for (const e of r.events ?? []) {
      if (e.type === 'updated' && e.workout)
        items.push({ type: 'updated', workout: e.workout });
      else if (e.type === 'deleted' && e.id)
        items.push({ type: 'deleted', id: e.id });
    }
    return { pageCount: r.page_count ?? 1, items };
  }

  async exerciseTemplates(
    apiKey: string,
    page: number,
  ): Promise<Page<HevyTemplate>> {
    const r = await this.call<{
      page_count: number;
      exercise_templates?: HevyTemplate[];
    }>(apiKey, `/v1/exercise_templates?page=${page}&pageSize=100`);
    return { pageCount: r.page_count ?? 1, items: r.exercise_templates ?? [] };
  }

  async createRoutine(
    apiKey: string,
    routine: { title: string; notes: string; exercises: RoutineExercise[] },
  ): Promise<{ id: string | null }> {
    const r = await this.call<{
      routine?: { id?: string } | { id?: string }[];
    }>(apiKey, '/v1/routines', {
      method: 'POST',
      body: { routine: { ...routine, folder_id: null } },
    });
    const created = Array.isArray(r.routine) ? r.routine[0] : r.routine;
    return { id: created?.id ?? null };
  }
}
