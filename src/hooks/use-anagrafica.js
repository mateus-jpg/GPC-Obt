'use client';

import useSWR from 'swr';
import { getAnagrafica } from '@/actions/anagrafica/anagrafica';
import { getAccessAction } from '@/actions/anagrafica/access';
import { getEventsAction } from '@/actions/anagrafica/events';
import { SWR_CACHE_TIME } from '@/lib/swr-config';

/**
 * Hook for fetching a single anagrafica record
 * Uses server action with SWR for client-side caching
 *
 * @param {string} id - The anagrafica document ID
 * @param {Object} options - Additional SWR options
 * @returns {Object} { anagrafica, error, isLoading, isValidating, mutate }
 */
export function useAnagrafica(id, options = {}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    id ? ['anagrafica', id] : null,
    async () => {
      const result = await getAnagrafica(id);
      return JSON.parse(result);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: SWR_CACHE_TIME.MEDIUM,
      ...options,
    }
  );

  return {
    anagrafica: data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching access records for an anagrafica
 * Uses server action with SWR for client-side caching
 *
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {Object} options - Additional SWR options
 * @returns {Object} { accessi, error, isLoading, isValidating, mutate }
 */
export function useAccessi(anagraficaId, options = {}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    anagraficaId ? ['accessi', anagraficaId] : null,
    async () => {
      return await getAccessAction(anagraficaId);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: SWR_CACHE_TIME.SHORT,
      ...options,
    }
  );

  return {
    accessi: data?.accessi || [],
    count: data?.count || 0,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching events for an anagrafica
 * Uses server action with SWR for client-side caching
 *
 * @param {string} anagraficaId - The anagrafica document ID
 * @param {Object} options - Additional SWR options
 * @returns {Object} { eventi, error, isLoading, isValidating, mutate }
 */
export function useEventi(anagraficaId, options = {}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    anagraficaId ? ['eventi', anagraficaId] : null,
    async () => {
      return await getEventsAction(anagraficaId);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: SWR_CACHE_TIME.SHORT,
      ...options,
    }
  );

  return {
    eventi: data?.eventi || [],
    count: data?.count || 0,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
