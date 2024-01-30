import { expect } from 'chai';

import { ended } from './ended';

describe('ended', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = ended('completed', {
      productId: '123',
      productType: 'track',
      sourceId: '',
      sourceType: '',
    });

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal('ended');
    expect(result.detail.reason).to.equal('completed');
  });
});
