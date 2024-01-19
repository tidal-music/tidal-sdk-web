import type {
  AssetPresentation,
  AudioMode,
  AudioQuality,
  Codec,
  StreamType,
  VideoQuality,
} from '../internal/types';

/**
 * Contains playback related information for active media product.
 */
export type PlaybackContext = {
  actualAssetPresentation: AssetPresentation;
  actualAudioMode: AudioMode | null;
  actualAudioQuality: AudioQuality | null;
  actualDuration: number;
  actualProductId: string;
  actualStreamType: StreamType | null;
  actualVideoQuality: VideoQuality | null;
  assetPosition: number;
  bitDepth: null | number;
  codec: Codec | null;
  playbackSessionId: string;
  sampleRate: null | number;
};

/**
 * IDLE: TIDAL Player has no active media product and nothing
 * set as next. This is the “default” state, nothing is happening
 * and nothing is scheduled to happen. This is the state which
 * TIDAL Player boots into, it is also the state reached after the
 * last requested media product finishes playing or after call to reset().
 *
 * PLAYING: TIDAL Player is currently playing the active media product.
 *
 * NOT_PLAYING: TIDAL Player has an active media product, but it is
 * currently not trying to play it. This can be due to the user having
 * pressed pause, some error occurred etc.
 *
 * STALLED: Playback is currently stalled due to some unexpected/unwanted
 * reason but TIDAL Player is still trying to play. E.g. buffering,
 * device resource issues etc. If TIDAL Player manages to resume playback
 * by itself, state will change to PLAYING. If TIDAL Player fails to
 * resume playback, state will change to NOT_PLAYING and a descriptive
 * UserMessage will be sent.
 */
export type PlaybackState = 'IDLE' | 'NOT_PLAYING' | 'PLAYING' | 'STALLED';
export type LoudnessNormalizationMode = 'ALBUM' | 'NONE' | 'TRACK';
export type { AudioQuality } from '../internal/types';

/**
 * Contains information about a TIDAL media product.
 */
export type MediaProduct = {
  /** The id of the product to play */
  productId: string;
  /** The type of the product to play */
  productType: 'track' | 'video';
  /** Optional client-set reference id to handle duplicated in a play queue implementation */
  referenceId?: string;
  /** The id of the source to playing, passed along for event tracking */
  sourceId: string;
  /** The type of the source to playing, passed along for event tracking */
  sourceType: string;
};
