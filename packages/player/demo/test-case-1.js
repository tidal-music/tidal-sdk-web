import * as Player from '../';

import { login, print } from './helpers.js';

await login();

print('Loading 4141413');
await Player.load({
  productId: '4141413',
  productType: 'track',
  sourceId: '4141352',
  sourceType: 'ALBUM',
});
print('Playing 4141413');
await Player.play();
