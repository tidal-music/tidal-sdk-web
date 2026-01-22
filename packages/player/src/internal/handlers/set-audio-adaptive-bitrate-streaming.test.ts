import { expect } from 'chai';

import * as Config from '../../config';

import { setAudioAdaptiveBitrateStreaming } from './set-audio-adaptive-bitrate-streaming';

describe('setAudioAdaptiveBitrateStreaming', () => {
  it('sets audioAdaptiveBitrateStreaming to false in config', () => {
    setAudioAdaptiveBitrateStreaming(false);

    expect(Config.get('audioAdaptiveBitrateStreaming')).to.equal(false);
  });

  it('sets audioAdaptiveBitrateStreaming to true in config', () => {
    setAudioAdaptiveBitrateStreaming(true);

    expect(Config.get('audioAdaptiveBitrateStreaming')).to.equal(true);
  });
});
