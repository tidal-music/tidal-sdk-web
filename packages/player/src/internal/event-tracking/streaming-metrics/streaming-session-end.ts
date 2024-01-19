import { createReducer } from '../../helpers/reducer';

export type Payload = {
  streamingSessionId: string;
  timestamp: number;
};

export type StreamingSessionEnd = {
  name: 'streaming_session_end';
  payload: Payload;
};

const defaultPayload: Payload = {
  streamingSessionId: '',
  timestamp: 0,
};

const reducer = await createReducer<Payload, 'streaming_session_end'>(
  'streaming_session_end',
  defaultPayload,
);

/**
 * The streaming session end event is sent by clients once a streaming session
 * ends, for whatever reason. It represents the end of a streaming session.
 */
export function streamingSessionEnd(newData: Parameters<typeof reducer>[0]) {
  return reducer(newData);
}
