/**
 * SWR configuration for client-side data caching
 * Provides global defaults for all useSWR hooks
 */

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
 */
export const swrConfig = {
  fetcher,
  // Revalidation settings
  revalidateOnFocus: false,       // Don't refetch when window regains focus
  revalidateOnReconnect: true,    // Refetch when browser regains connection
  revalidateIfStale: true,        // Use stale data while revalidating
  dedupingInterval: 5000,         // Dedupe requests within 5 seconds

  // Cache settings
  refreshInterval: 0,             // No automatic refresh (data is relatively static)

  // Error handling
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,

  // Performance
  suspense: false,                // Don't use React Suspense by default
  keepPreviousData: true,         // Show previous data while fetching new data
};

/**
 * Cache time constants (in milliseconds)
 * For use with useSWR's refreshInterval option
 */
export const SWR_CACHE_TIME = {
  SHORT: 30 * 1000,      // 30 seconds
  MEDIUM: 60 * 1000,     // 1 minute
  LONG: 5 * 60 * 1000,   // 5 minutes
  VERY_LONG: 10 * 60 * 1000, // 10 minutes
};
