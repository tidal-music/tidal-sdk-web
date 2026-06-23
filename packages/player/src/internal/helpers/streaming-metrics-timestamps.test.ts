import { expect } from 'chai';

import { timestamps } from './streaming-metrics-timestamps.js';

describe('streamingMetricsTimestamps', () => {
  it('stores and retrieves a timestamp by prefix and streaming session id', () => {
    const prefix = 'streaming_metrics:test:startTimestamp';
    const streamingSessionId = 'session-with-timestamp';

    timestamps.mark(prefix, streamingSessionId);

    expect(timestamps.get(prefix, streamingSessionId)).to.be.a('number');
  });

  it('keeps timestamps isolated by streaming session id', () => {
    const prefix = 'streaming_metrics:test:startTimestamp';
    const firstStreamingSessionId = 'first-session';
    const secondStreamingSessionId = 'second-session';

    timestamps.mark(prefix, firstStreamingSessionId);

    expect(timestamps.get(prefix, firstStreamingSessionId)).to.be.a('number');
    expect(timestamps.get(prefix, secondStreamingSessionId)).to.equal(
      undefined,
    );
  });

  it('clears only the requested timestamp', () => {
    const prefix = 'streaming_metrics:test:endTimestamp';
    const otherPrefix = 'streaming_metrics:test:startTimestamp';
    const streamingSessionId = 'session-to-clear';

    timestamps.mark(prefix, streamingSessionId);
    timestamps.mark(otherPrefix, streamingSessionId);

    timestamps.clear(prefix, streamingSessionId);

    expect(timestamps.get(prefix, streamingSessionId)).to.equal(undefined);
    expect(timestamps.get(otherPrefix, streamingSessionId)).to.be.a('number');

    timestamps.clear(otherPrefix, streamingSessionId);
  });

  it('does nothing when streaming session id is undefined', () => {
    const prefix = 'streaming_metrics:test:startTimestamp';

    timestamps.mark(prefix, undefined);
    timestamps.clear(prefix, undefined);

    expect(timestamps.get(prefix, undefined)).to.equal(undefined);
  });
});
