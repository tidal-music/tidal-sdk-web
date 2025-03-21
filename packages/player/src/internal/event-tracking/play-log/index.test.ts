import { expect } from 'chai';

import { mapProductTypeToPlayLogProductType } from './index';

describe('mapProductTypeToPlayLogProductType', () => {
  it('returns the correct playlog product type for tracks', () => {
    expect(mapProductTypeToPlayLogProductType('track')).to.equal('TRACK');
  });

  it('returns the correct playlog product type for videos', () => {
    expect(mapProductTypeToPlayLogProductType('video')).to.equal('VIDEO');
  });

  it('returns the correct playlog product type for demos', () => {
    expect(mapProductTypeToPlayLogProductType('demo')).to.equal('UC');
  });
});
