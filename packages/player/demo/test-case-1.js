import * as Player from '../';

import { login, print } from './helpers.js';

await login();

print('Loading video 159073354');
await Player.load({
  productId: '159073354',
  productType: 'video',
  sourceId: '159073354',
  sourceType: 'VIDEO',
});

// Seek near the end to make test faster (video is ~93 seconds)
await Player.seek(88);

print('Playing video 159073354');
await Player.play();
