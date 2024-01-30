import { expect } from 'chai';

import * as Config from '../../config';

import { setVolumeLevel } from './set-volume-level';

describe('setVolumeLevel', () => {
  it('sets desiredVolumeLevel in config', () => {
    setVolumeLevel(0.6);

    expect(Config.get('desiredVolumeLevel')).to.equal(0.6);
  });
});
