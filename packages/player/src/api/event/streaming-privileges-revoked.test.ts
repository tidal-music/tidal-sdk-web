import { expect } from '@esm-bundle/chai';

import {
  eventName,
  streamingPrivilegesRevokedEvent,
} from './streaming-privileges-revoked';

describe('streamingPrivilegesRevokedEvent', () => {
  it('creates a CustomEvent with a predetermined name and playing device name in detail', () => {
    const result = streamingPrivilegesRevokedEvent('Tesla');

    expect(result instanceof CustomEvent).to.equal(true);
    expect(result.type).to.equal(eventName);
    expect(result.detail).to.equal('Tesla');
  });
});
