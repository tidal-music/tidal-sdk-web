import { expect } from 'chai';

import * as Config from '../../config.js';

import { getStreamingWifiAudioQuality } from './get-streaming-wifi-audio-quality.js';

describe('getStreamingWifiAudioQuality', () => {
  it('returns streamingWifiAudioQuality from config', () => {
    expect(getStreamingWifiAudioQuality()).to.equal(
      Config.get('streamingWifiAudioQuality'),
    );
  });
});
