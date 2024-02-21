// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { setStreamingWifiAudioQuality } from './set-streaming-wifi-audio-quality';

describe('setStreamingWifiAudioQuality', () => {
  it('sets the client token in config', () => {
    setStreamingWifiAudioQuality('HI_RES');

    expect(Config.get('streamingWifiAudioQuality')).toEqual('HI_RES');
  });
});
