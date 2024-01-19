import { createReducer } from '../../helpers/reducer';

export type Payload = {
  endReason: 'COMPLETE' | 'ERROR' | 'OTHER';
  endTimestamp: number;
  errorCode: null | string;
  errorMessage: null | string;
  startTimestamp: number;
  streamingSessionId: string;
};

export type PlaybackInfoFetch = {
  name: 'playback_info_fetch';
  payload: Payload;
};

const defaultPayload: Payload = {
  endReason: 'COMPLETE',
  endTimestamp: 0,
  errorCode: null,
  errorMessage: null,
  startTimestamp: 0,
  streamingSessionId: '',
};

const reducer = await createReducer<Payload, 'playback_info_fetch'>(
  'playback_info_fetch',
  defaultPayload,
);

/**
 * Create playbackInfoFetch event.
 */
export function playbackInfoFetch(newData: Parameters<typeof reducer>[0]) {
  return reducer(newData);
}
