export const SDK_BATCH_INTERVAL = 15_000;

export const INTERCEPT_OPTIONS = {
  headers: {
    'content-type': 'application/json; boundary=player-sdk',
  },
  method: 'POST',
  url: 'https://et.tidal.com/api/events',
};
