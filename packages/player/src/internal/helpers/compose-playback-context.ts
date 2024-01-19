import type { PlaybackContext } from '../../api/interfaces';

import type { StreamInfo } from './manifest-parser';
import type { PlaybackInfo } from './playback-info-resolver';

type Params = {
  assetPosition: number;
  duration: number;
  playbackInfo: PlaybackInfo;
  streamInfo: StreamInfo;
};

export const composePlaybackContext = ({
  assetPosition,
  duration,
  playbackInfo,
  streamInfo,
}: Params): PlaybackContext => ({
  actualAssetPresentation: playbackInfo.assetPresentation,
  actualAudioMode: 'audioMode' in playbackInfo ? playbackInfo.audioMode : null,
  actualAudioQuality:
    'audioQuality' in playbackInfo ? playbackInfo.audioQuality : null,
  actualDuration: duration,
  actualProductId: String(
    'videoId' in playbackInfo ? playbackInfo.videoId : playbackInfo.trackId,
  ),
  actualStreamType:
    'streamType' in playbackInfo ? playbackInfo.streamType : null,
  actualVideoQuality:
    'videoQuality' in playbackInfo ? playbackInfo.videoQuality : null,
  assetPosition,
  bitDepth: streamInfo.bitDepth ?? null,
  codec: streamInfo.codec ?? null,
  playbackSessionId: streamInfo.streamingSessionId,
  sampleRate: streamInfo.sampleRate ?? null,
});
