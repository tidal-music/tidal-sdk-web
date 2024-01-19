import type { PlaybackState } from '../interfaces';

type PlaybackStateChangePayload = {
  state: PlaybackState;
};

export type PlaybackStateChange = CustomEvent<PlaybackStateChangePayload>;

export function playbackStateChange(state: PlaybackState): PlaybackStateChange {
  return new CustomEvent<PlaybackStateChangePayload>('playback-state-change', {
    detail: {
      state,
    },
  });
}
