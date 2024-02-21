// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from '../../config';

import { getStreamingWifiAudioQuality } from './get-streaming-wifi-audio-quality';

describe('getStreamingWifiAudioQuality', () => {
  it('returns streamingWifiAudioQuality from config', () => {
    expect(getStreamingWifiAudioQuality()).toEqual(
      Config.get('streamingWifiAudioQuality'),
    );
  });
});
