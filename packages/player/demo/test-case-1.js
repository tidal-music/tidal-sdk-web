import * as Player from '../';

import { login } from './login.js';

await login();

Player.events.addEventListener('ended', () => {
  document.dispatchEvent(new CustomEvent('player-sdk:ended'));
});

Player.events.addEventListener('media-product-transition', () => {
  document.dispatchEvent(
    new CustomEvent('player-sdk:media-product-transition'),
  );
});

await Player.load({
  productId: '108506136',
  productType: 'track',
  sourceId: '4141352',
  sourceType: 'ALBUM',
});
await Player.play();
