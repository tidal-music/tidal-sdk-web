import { createReducer } from '../../helpers/reducer';

export type Payload = {
  playback: {
    // Duration of entire media product. Used to calculate if entire media product has been played or not.
    durationMS: number;
    // Media product id (Track/Video id).
    id: string;
    // Exact asset position where playback stopped. Milliseconds.
    playedMS: number;
    source: {
      id: string;
      type: string;
    };
    // Type of product being played.
    type: 'TRACK' | 'VIDEO';
  };
};

export type Progress = {
  name: 'progress';
  payload: Payload;
};

const defaultPayload: Payload = {
  playback: {
    durationMS: 0,
    id: '',
    playedMS: 0,
    source: {
      id: '',
      type: 'playlist',
    },
    type: 'TRACK',
  },
};

const reducer = await createReducer<Payload, 'progress'>(
  'progress',
  defaultPayload,
);

export function progress(newData: Parameters<typeof reducer>[0]) {
  return reducer(newData);
}
