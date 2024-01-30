import { expect } from 'chai';

import { events } from './event-bus';
import { PlayerError } from './internal/index';
import { credentialsProvider, waitForEvent } from './test-helpers';

import * as Player from './index';

Player.setCredentialsProvider(credentialsProvider);

describe('eventBus', () => {
  it('playback engine sends events through the bus', async () => {
    const mediaProductTransitionEvents = [];

    events.addEventListener('media-product-transition', e =>
      mediaProductTransitionEvents.push(e),
    );

    await Player.load(
      {
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );

    expect(mediaProductTransitionEvents.length).to.be.greaterThan(0);
  });

  it('dispatches a player error', async () => {
    const errorEvents = [];

    events.addEventListener('error', e => errorEvents.push(e));

    const eventDispatched = waitForEvent(events, 'error');

    events.dispatchError(new PlayerError('EUnexpected', 'B9999'));
    await eventDispatched;

    expect(errorEvents.length).to.be.greaterThan(0);
  });
});
