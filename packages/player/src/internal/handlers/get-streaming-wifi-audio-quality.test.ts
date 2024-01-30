import { expect } from 'chai';

import * as Config from '../../config';

import { getStreamingWifiAudioQuality } from './get-streaming-wifi-audio-quality';

describe('getStreamingWifiAudioQuality', () => {
  it('returns streamingWifiAudioQuality from config', () => {
    expect(getStreamingWifiAudioQuality()).to.equal(
      Config.get('streamingWifiAudioQuality'),
    );
  });
});
