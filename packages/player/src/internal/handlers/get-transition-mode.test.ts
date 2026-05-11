import { expect } from 'chai';

import * as Config from '../../config';

import { getTransitionMode } from './get-transition-mode';

describe('getTransitionMode', () => {
  it('returns crossfadeInMs from config', () => {
    expect(getTransitionMode()).to.equal(Config.get('crossfadeInMs'));
  });

  it('reflects updated crossfadeInMs values', () => {
    const original = Config.get('crossfadeInMs');

    try {
      Config.update({ crossfadeInMs: 4500 });
      expect(getTransitionMode()).to.equal(4500);

      Config.update({ crossfadeInMs: 0 });
      expect(getTransitionMode()).to.equal(0);
    } finally {
      Config.update({ crossfadeInMs: original });
    }
  });
});
