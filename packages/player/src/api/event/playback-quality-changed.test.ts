import { expect } from 'chai';

import type { PlaybackContext } from '../interfaces';

import { playbackQualityChanged } from './playback-quality-changed';

describe('playbackQualityChanged', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const playbackContext: PlaybackContext = {
      actualAssetPresentation: 'FULL',
      actualAudioMode: 'STEREO',
      actualAudioQuality: 'HI_RES_LOSSLESS',
      actualDuration: 207.61,
      actualProductId: '4347054',
      actualStreamType: 'ON_DEMAND',
      actualVideoQuality: null,
      assetPosition: 0,
      bandwidth: 2000000,
      bitDepth: 24,
      codec: 'flac',
      playbackSessionId: '41386807-aa95-44bc-a992-d1198dcf1ab3',
      sampleRate: 96000,
    };
    const result = playbackQualityChanged(playbackContext);

    expect(result instanceof CustomEvent).to.equal(true);

    expect(result.type).to.equal('playback-quality-changed');

    expect(result.detail.playbackContext).to.equal(playbackContext);
  });
});
