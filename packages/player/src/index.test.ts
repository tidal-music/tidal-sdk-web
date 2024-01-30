import { expect } from 'chai';

import * as Config from './config';
import { credentialsProvider, mockNativePlayer } from './test-helpers';

import * as Player from './index';

Player.setCredentialsProvider(credentialsProvider);

describe('bootstrap', () => {
  it('enables output devices if options.outputDevices is true', () => {
    Player.bootstrap({ outputDevices: true, players: [] });

    expect(Config.get('outputDevicesEnabled')).to.equal(true);
  });
});

describe('getMediaElement', () => {
  it('is null if there is no player', () => {
    const mediaElement = Player.getMediaElement();

    expect(mediaElement).to.equal(null);
  });

  it('returns the mediaElement value on shaka player', async () => {
    Player.bootstrap({
      outputDevices: false,
      players: [
        {
          itemTypes: ['track'],
          player: 'shaka',
          qualities: ['LOW'],
        },
      ],
    });

    Player.setStreamingWifiAudioQuality('LOW');

    await Player.load(
      {
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );

    const mediaElement = Player.getMediaElement();

    expect(mediaElement).to.be.instanceOf(HTMLMediaElement);
  });

  /* To enalbe this test we need another test user with HTMLMediaElement compatible streaming configuration (MP3 Preview?). */
  it.skip('returns the mediaElement value on browser player', async () => {
    Player.bootstrap({
      outputDevices: false,
      players: [
        {
          itemTypes: ['track'],
          player: 'browser',
          qualities: ['LOW'],
        },
      ],
    });

    Player.setStreamingWifiAudioQuality('LOW');

    await Player.load(
      {
        productId: '141120674',
        productType: 'track',
        sourceId: 'tidal-player-tests',
        sourceType: 'tidal-player-tests',
      },
      0,
    );

    const mediaElement = Player.getMediaElement();

    expect(mediaElement).to.be.instanceOf(HTMLMediaElement);
  });

  it('returns null if active player is native player', async () => {
    mockNativePlayer();

    Player.bootstrap({
      outputDevices: false,
      players: [
        {
          itemTypes: ['track'],
          player: 'native',
          qualities: ['LOW'],
        },
      ],
    });

    const mediaElement = Player.getMediaElement();

    expect(mediaElement).to.equal(null);
  });
});
