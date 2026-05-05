import { events } from '../event-bus';
import { PlayerError } from '../internal';
import { trueTime } from '../internal/true-time';

/**
 * Default ceiling for raw HTMLMediaElement `error` events the player will
 * forward to `console.error` (and therefore RUM) within the rolling window
 * before the circuit breaker trips.
 */
export const DEFAULT_MAX_MEDIA_ELEMENT_ERRORS = 10;

/**
 * Rolling window length used by the circuit breaker. If no error occurs for
 * this many ms the counter is reset, so transient spikes don't permanently
 * silence later errors.
 */
export const DEFAULT_MEDIA_ELEMENT_ERROR_WINDOW_MS = 60_000;

export type MediaElementErrorCircuitBreakerOptions = {
  errorWindowMs?: number;
  log?: (event: Event) => void;
  maxErrors?: number;
  now?: () => number;
  onLimitReached?: () => void;
};

const defaultLog = (event: Event) => {
  console.error(
    'HTMLMediaElement errored',
    (event.target as HTMLMediaElement | null)?.error ?? null,
  );
};

const defaultOnLimitReached = () => {
  console.error(
    'HTMLMediaElement error limit reached, suppressing further errors',
  );
  events.dispatchError(new PlayerError('EUnexpected', 'ME01'));
};

/**
 * Creates a stateful circuit breaker for HTMLMediaElement `error` events.
 *
 * Some broken playback environments (e.g. an Electron desktop session whose
 * audio device disappeared after sleep/resume) cause the underlying
 * `<video>` / `<audio>` element to fire `error` events continuously — tens
 * of thousands per minute. Each one used to be forwarded straight to
 * `console.error`, which RUM picks up as an error event and was responsible
 * for ~99.9% of `HTMLMediaElement errored null` reports coming from a
 * handful of stuck sessions.
 *
 * The breaker:
 * - Logs up to `maxErrors` events normally inside a rolling
 *   `errorWindowMs` window.
 * - On the Nth error, dispatches a `PlayerError('EUnexpected', 'ME01')` so
 *   the host app can react (stop playback, show UI, etc.) and logs a
 *   "limit reached" message.
 * - Suppresses further `console.error` output until either the window
 *   elapses with no errors or `reset()` is called explicitly (typically
 *   from the player's `reset()` / `load()`).
 */
export function createMediaElementErrorCircuitBreaker(
  options: MediaElementErrorCircuitBreakerOptions = {},
) {
  const {
    errorWindowMs = DEFAULT_MEDIA_ELEMENT_ERROR_WINDOW_MS,
    log = defaultLog,
    maxErrors = DEFAULT_MAX_MEDIA_ELEMENT_ERRORS,
    now = () => trueTime.now(),
    onLimitReached = defaultOnLimitReached,
  } = options;

  let count = 0;
  let lastErrorAt = 0;

  return {
    handleError(event: Event) {
      const t = now();

      if (t - lastErrorAt > errorWindowMs) {
        count = 0;
      }

      lastErrorAt = t;
      count += 1;

      if (count <= maxErrors) {
        log(event);
      }

      if (count === maxErrors) {
        onLimitReached();
      }
    },
    reset() {
      count = 0;
      lastErrorAt = 0;
    },
  };
}
