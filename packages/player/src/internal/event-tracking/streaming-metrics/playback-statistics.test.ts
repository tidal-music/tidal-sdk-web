import { expect } from 'chai';

import { playbackStatistics } from './playback-statistics.js';

describe('playbackStatistics', () => {
  it('keeps start timestamps null when playback never started', async () => {
    const event = await playbackStatistics({
      streamingSessionId: crypto.randomUUID(),
    });

    // Never-started sessions must report null (not 0) so they can be
    // excluded from startup time metrics.
    expect(event?.payload.actualStartTimestamp).to.equal(null);
    expect(event?.payload.idealStartTimestamp).to.equal(null);
  });

  it('keeps reported start timestamps across subsequent updates', async () => {
    const streamingSessionId = crypto.randomUUID();

    await playbackStatistics({
      actualStartTimestamp: 1234,
      streamingSessionId,
    });
    const event = await playbackStatistics({
      idealStartTimestamp: 1000,
      streamingSessionId,
    });

    expect(event?.payload.actualStartTimestamp).to.equal(1234);
    expect(event?.payload.idealStartTimestamp).to.equal(1000);
  });
});
