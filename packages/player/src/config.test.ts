import { expect } from 'chai';

import * as Config from './config';

describe('Config', () => {
  it('can set/get value', async () => {
    Config.update({
      eventUrl: 'tidal-hifi',
    });

    expect(Config.get('eventUrl')).to.equal('tidal-hifi');
  });
});
