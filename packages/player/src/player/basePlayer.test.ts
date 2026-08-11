import { expect } from 'chai';

import { db } from '../internal/helpers/event-session.js';
import { streamingSessionStore } from '../internal/helpers/streaming-session-store.js';
import { waitFor } from '../internal/helpers/wait-for.js';

import { BasePlayer } from './basePlayer.js';

type PlaybackStatisticsPayload = { actualStartTimestamp: number | null };

async function getPlaybackStatistics(streamingSessionId: string) {
  // The reducer write is fire-and-forget, poll for it.
  for (let i = 0; i < 40; i++) {
    const event = await db.get<PlaybackStatisticsPayload>({
      name: 'playback_statistics',
      streamingSessionId,
    });

    if (event) {
      return event;
    }

    await waitFor(10);
  }

  return undefined;
}

describe('BasePlayer.mediaProductActuallyStarted', () => {
  it('reports actualStartTimestamp only for the first call per session', async () => {
    const player = new BasePlayer();
    const streamingSessionId = crypto.randomUUID();

    player.mediaProductActuallyStarted(streamingSessionId);

    const event = await getPlaybackStatistics(streamingSessionId);
    const firstValue = event?.payload.actualStartTimestamp;

    expect(firstValue).to.be.a('number');

    // A later call (e.g. 'playing' after resume from pause or stall) must
    // not overwrite the reported value. Wait so a re-report would yield a
    // different timestamp, then give the (fire-and-forget) write time to
    // land before re-reading.
    await waitFor(20);
    player.mediaProductActuallyStarted(streamingSessionId);
    await waitFor(20);

    const eventAfterSecondCall =
      await getPlaybackStatistics(streamingSessionId);

    expect(eventAfterSecondCall?.payload.actualStartTimestamp).to.equal(
      firstValue,
    );

    streamingSessionStore.deleteSession(streamingSessionId);
  });

  it('does nothing for an undefined streaming session id', () => {
    const player = new BasePlayer();

    expect(() => player.mediaProductActuallyStarted(undefined)).to.not.throw();
  });
});
