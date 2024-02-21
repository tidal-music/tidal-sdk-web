// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import * as Config from './config';

describe('Config', () => {
  it('can set/get value', async () => {
    Config.update({
      eventUrl: 'tidal-hifi',
    });

    expect(Config.get('eventUrl')).to.equal('tidal-hifi');
  });
});
