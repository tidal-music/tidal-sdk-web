import { expect } from 'chai';

import * as Config from '../../config';

import { setStreamingWifiAudioQuality } from './set-streaming-wifi-audio-quality';

describe('setStreamingWifiAudioQuality', () => {
  it('sets the client token in config', () => {
    setStreamingWifiAudioQuality('HI_RES');

    expect(Config.get('streamingWifiAudioQuality')).to.equal('HI_RES');
  });
});
