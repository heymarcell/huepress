/**
 * D1 Utility functions for timeout handling and resilience
 */

/**
 * Wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param ms Timeout in milliseconds
 * @param errorMessage Custom error message
 * @returns The promise result or throws on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'D1_TIMEOUT'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    )
  ]);
}

/**
 * Default D1 query timeout (5 seconds)
 * Users should never wait more than this for a page load
 */
export const D1_TIMEOUT_MS = 5000;

/**
 * Check if an error is a D1 timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === 'D1_TIMEOUT';
}
