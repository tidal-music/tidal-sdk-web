import * as Player from '../';

import { login, print, waitFor } from './helpers.js';

await login();

const TIME_BEFORE_SEEK = 20_000;

print('Loading 91298890');
await Player.load({
  productId: '91298890',
  productType: 'track',
  sourceId: '4141352',
  sourceType: 'ALBUM',
});
print('Playing 91298890');
await Player.play();

const playbackContext = Player.getPlaybackContext();
const trackDuration = playbackContext.actualDuration;
const SEEK_TO = trackDuration - TIME_BEFORE_SEEK / 1000;

print(`Waiting ${TIME_BEFORE_SEEK}`);
await waitFor(TIME_BEFORE_SEEK);
print(`Seeking ${SEEK_TO}`);
await Player.seek(SEEK_TO);
print(`Playing to end...`);
