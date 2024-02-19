import * as Player from '../';

import { login, print } from './helpers.js';

await login();

print('Loading 108506136');
await Player.load({
  productId: '108506136',
  productType: 'track',
  sourceId: '4141352',
  sourceType: 'ALBUM',
});
print('Playing 108506136');
await Player.play();
