import { expect } from 'chai';

import { composePlaybackContext } from './compose-playback-context';
import type { StreamInfo } from './manifest-parser';
import type { PlaybackInfoTrack } from './playback-info-resolver';

describe('composePlaybackContext', () => {
  const streamInfo: StreamInfo = {
    bitDepth: 16,
    codec: 'flac',
    expires: 3600000,
    id: 'test-stream-id',
    prefetched: false,
    quality: 'LOSSLESS',
    sampleRate: 44100,
    streamUrl: 'https://example.com/stream',
    streamingSessionId: 'test-session-id',
    type: 'track',
  };

  it('composes playback context from track playback info', () => {
    const playbackInfo: PlaybackInfoTrack = {
      albumPeakAmplitude: 0,
      albumReplayGain: 0,
      assetPresentation: 'FULL',
      audioMode: 'STEREO',
      audioQuality: 'LOSSLESS',
      bitDepth: null,
      manifest: '',
      manifestMimeType: 'application/dash+xml',
      prefetched: false,
      previewReason: 'FULL_REQUIRES_PURCHASE',
      sampleRate: null,
      streamingSessionId: 'test-session-id',
      trackId: 12345,
      trackPeakAmplitude: 0,
      trackReplayGain: 0,
    };

    const result = composePlaybackContext({
      assetPosition: 10,
      duration: 200,
      playbackInfo: { ...playbackInfo, expires: 3600000 },
      streamInfo,
    });

    expect(result.actualAssetPresentation).to.equal('FULL');
    expect(result.actualAudioMode).to.equal('STEREO');
    expect(result.actualAudioQuality).to.equal('LOSSLESS');
    expect(result.actualProductId).to.equal('12345');
    expect(result.assetPosition).to.equal(10);
    expect(result.actualDuration).to.equal(200);
    expect(result.actualStreamType).to.equal(null);
    expect(result.actualVideoQuality).to.equal(null);
    expect(result.previewReason).to.equal('FULL_REQUIRES_PURCHASE');
  });
});
