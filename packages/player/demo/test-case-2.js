import * as Player from '../';

import { login, print, waitFor } from './helpers.js';

await login();

const TIME_BEFORE_SEEK = 5_000;

print('Loading video 159073354');
await Player.load({
  productId: '159073354',
  productType: 'video',
  sourceId: '159073354',
  sourceType: 'VIDEO',
});
print('Playing video 159073354');
await Player.play();

const playbackContext = Player.getPlaybackContext();
const videoDuration = playbackContext.actualDuration;
const SEEK_TO = videoDuration - TIME_BEFORE_SEEK / 1000;

print(`Waiting ${TIME_BEFORE_SEEK}`);
await waitFor(TIME_BEFORE_SEEK);
print(`Seeking ${SEEK_TO}`);
await Player.seek(SEEK_TO);
print(`Playing to end...`);
