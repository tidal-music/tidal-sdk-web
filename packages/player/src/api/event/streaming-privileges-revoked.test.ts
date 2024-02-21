// eslint-disable-next-line no-restricted-imports
import { describe, expect, it } from 'vitest';

import {
  eventName,
  streamingPrivilegesRevokedEvent,
} from './streaming-privileges-revoked';

describe('streamingPrivilegesRevokedEvent', () => {
  it('creates a CustomEvent with a predetermined name and playing device name in detail', () => {
    const result = streamingPrivilegesRevokedEvent('Tesla');

    expect(result instanceof CustomEvent).toEequal(true);
    expect(result.type).toEqual(eventName);
    expect(result.detail).toEqual('Tesla');
  });
});
