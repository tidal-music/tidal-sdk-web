import { expect } from 'chai';

import * as Config from '../../config';

import { setTransitionMode } from './set-transition-mode';

describe('setTransitionMode', () => {
  const original = Config.get('crossfadeInMs');

  afterEach(() => {
    Config.update({ crossfadeInMs: original });
  });

  it('stores valid integer values in config', () => {
    setTransitionMode(5000);
    expect(Config.get('crossfadeInMs')).to.equal(5000);
  });

  it('rounds fractional millisecond values', () => {
    setTransitionMode(1234.7);
    expect(Config.get('crossfadeInMs')).to.equal(1235);
  });

  it('treats zero as gapless (lower bound)', () => {
    setTransitionMode(0);
    expect(Config.get('crossfadeInMs')).to.equal(0);
  });

  it('clamps negative values to 0', () => {
    setTransitionMode(-2500);
    expect(Config.get('crossfadeInMs')).to.equal(0);
  });

  it('clamps values above 15000 to 15000', () => {
    setTransitionMode(20000);
    expect(Config.get('crossfadeInMs')).to.equal(15000);
  });

  it('coerces NaN to 0', () => {
    setTransitionMode(Number.NaN);
    expect(Config.get('crossfadeInMs')).to.equal(0);
  });

  it('coerces non-finite values (Infinity / -Infinity) to 0', () => {
    setTransitionMode(Number.POSITIVE_INFINITY);
    expect(Config.get('crossfadeInMs')).to.equal(0);

    setTransitionMode(Number.NEGATIVE_INFINITY);
    expect(Config.get('crossfadeInMs')).to.equal(0);
  });
});
