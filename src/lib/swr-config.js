/**
 * SWR configuration for client-side data caching
 * Provides global defaults for all useSWR hooks
 */

import { SWR as SWR_CONFIG } from '@/config/constants';

/**
 * Default SWR fetcher function
 * Handles standard API responses and throws on error
 */
export const fetcher = async (url) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }

  return res.json();
};

/**
 * Global SWR configuration options
 * Applied to all useSWR hooks unless overridden
 * @see config/constants.js for centralized configuration
 */
export const swrConfig = {
  fetcher,
  // Revalidation settings
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: SWR_CONFIG.DEDUPING_INTERVAL,

  // Cache settings
  refreshInterval: 0,

  // Error handling
  shouldRetryOnError: true,
  errorRetryCount: SWR_CONFIG.ERROR_RETRY_COUNT,
  errorRetryInterval: SWR_CONFIG.ERROR_RETRY_INTERVAL,

  // Performance
  suspense: false,
  keepPreviousData: true,
};

/**
 * Cache time constants (in milliseconds)
 * @see config/constants.js for centralized configuration
 */
export const SWR_CACHE_TIME = SWR_CONFIG.CACHE_TIME;
