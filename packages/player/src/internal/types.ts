export type StreamType = 'LIVE' | 'ON_DEMAND';
export type AssetPresentation = 'FULL' | 'PREVIEW';
export type AudioMode = 'DOLBY_ATMOS' | 'SONY_360RA' | 'STEREO';

/**
 * @deprecated Use 'HI_RES_LOSSLESS' instead of 'HI_RES'.
 */
type DeprecatedAudioQuality = 'HI_RES';

export type AudioQuality =
  | 'HI_RES_LOSSLESS'
  | 'HIGH'
  | 'LOSSLESS'
  | 'LOW'
  | DeprecatedAudioQuality;

export type VideoQuality = 'AUDIO_ONLY' | 'HIGH' | 'LOW' | 'MEDIUM';
export type Codec = 'aac' | 'flac' | 'mp3';
