import { trueTime } from '../true-time.js';

const collectedStreamingMetrics = new Map<string, number>();

/** Builds the in-memory key for one timestamp within one streaming session. */
function timestampKey(prefix: string, streamingSessionId: string) {
  return `${prefix}:${streamingSessionId}`;
}

/** Safely collects a timestamp mark for a streaming metrics event. */
function mark(prefix: string, streamingSessionId: string | undefined) {
  if (!streamingSessionId) {
    return;
  }

  collectedStreamingMetrics.set(
    timestampKey(prefix, streamingSessionId),
    trueTime.now(),
  );
}

/** Reads a previously collected streaming metrics timestamp. */
function get(prefix: string, streamingSessionId: string | undefined) {
  if (!streamingSessionId) {
    return undefined;
  }

  return collectedStreamingMetrics.get(
    timestampKey(prefix, streamingSessionId),
  );
}

/** Clears a previously collected streaming metrics timestamp. */
function clear(prefix: string, streamingSessionId: string | undefined) {
  if (!streamingSessionId) {
    return;
  }

  collectedStreamingMetrics.delete(timestampKey(prefix, streamingSessionId));
}

export const timestamps = {
  clear,
  get,
  mark,
};
