import { expect } from 'chai';

import { preloadRequest } from './preload-request';

describe('preloadRequest', () => {
  it('creates a CustomEvent with a predetermined name', () => {
    const result = preloadRequest();

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal('preload-request');
  });
});
