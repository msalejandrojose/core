import { call } from '../api';
import type { PreviousSets } from './live-workout';

/** Lo que hiciste la última vez en cada ejercicio (series de trabajo). */
export const previousSetsApi = {
  get: (exerciseIds: string[]) =>
    exerciseIds.length
      ? call<PreviousSets[]>('GET', `/brio/routines/previous-sets?exerciseIds=${exerciseIds.map(encodeURIComponent).join(',')}`)
      : Promise.resolve([] as PreviousSets[]),
};
