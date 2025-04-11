import { createReducer, type Reducer } from '../../helpers/reducer';

export type Payload = {
  endReason: 'COMPLETE' | 'ERROR' | 'OTHER';
  endTimestamp: number;
  errorCode: null | string;
  errorMessage: null | string;
  startTimestamp: number;
  streamingSessionId: string;
};

export type DrmLicenseFetch = {
  name: 'drm_license_fetch';
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

const reducer: Reducer<Payload, 'drm_license_fetch'> = await createReducer(
  'drm_license_fetch',
  defaultPayload,
);

export function drmLicenseFetch(newData: Parameters<typeof reducer>[0]): Promise<{
  payload: Payload;
  name: "drm_license_fetch";
  streamingSessionId: string;
} | undefined> {
  return reducer(newData);
}
