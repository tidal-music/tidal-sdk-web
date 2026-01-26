import { expect } from 'chai';

import * as Config from '../../config';

import { getAudioAdaptiveBitrateStreaming } from './get-audio-adaptive-bitrate-streaming';

describe('getAudioAdaptiveBitrateStreaming', () => {
  it('returns audioAdaptiveBitrateStreaming from config', () => {
    expect(getAudioAdaptiveBitrateStreaming()).to.equal(
      Config.get('audioAdaptiveBitrateStreaming'),
    );
  });
});
