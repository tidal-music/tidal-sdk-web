import { expect } from 'chai';

import * as Config from '../../config';

import { setClientPlatform } from './set-client-platform';

describe('setClientPlatform handler', () => {
  it('sets the client token in config', () => {
    setClientPlatform('tomte');

    expect(Config.get('clientPlatform')).to.equal('tomte');
  });
});
