import { expect } from 'chai';

import * as Config from '../../config.js';

import { getAudioAdaptiveBitrateStreaming } from './get-audio-adaptive-bitrate-streaming.js';

describe('getAudioAdaptiveBitrateStreaming', () => {
  it('returns audioAdaptiveBitrateStreaming from config', () => {
    expect(getAudioAdaptiveBitrateStreaming()).to.equal(
      Config.get('audioAdaptiveBitrateStreaming'),
    );
  });
});
