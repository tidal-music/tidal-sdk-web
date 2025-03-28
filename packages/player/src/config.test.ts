import { expect } from 'chai';

import * as Config from './config';

describe('Config', () => {
  it('can set/get value', async () => {
    Config.update({
      desiredVolumeLevel: 0.1,
    });

    expect(Config.get('desiredVolumeLevel')).to.equal(0.1);
  });
});
