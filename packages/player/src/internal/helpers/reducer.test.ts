import { expect } from 'chai';

import { createReducer } from './reducer.js';

describe('createReducer', () => {
  it('merges fields from consecutive calls for the same session', async () => {
    const reducer = await createReducer('test_reducer_merge', {
      fieldA: null as number | null,
      fieldB: null as number | null,
    });

    const streamingSessionId = crypto.randomUUID();

    await reducer({ fieldA: 1, streamingSessionId });
    const result = await reducer({ fieldB: 2, streamingSessionId });

    expect(result?.payload.fieldA).to.equal(1);
    expect(result?.payload.fieldB).to.equal(2);
  });

  it('does not drop fields when calls for the same session race', async () => {
    const reducer = await createReducer('test_reducer_race', {
      fieldA: null as number | null,
      fieldB: null as number | null,
    });

    const streamingSessionId = crypto.randomUUID();

    // Both calls start in the same tick. Without serialized invocations both
    // would read the stored state before either has written, and the last
    // write would silently drop the other call's field.
    const [, second] = await Promise.all([
      reducer({ fieldA: 1, streamingSessionId }),
      reducer({ fieldB: 2, streamingSessionId }),
    ]);

    expect(second?.payload.fieldA).to.equal(1);
    expect(second?.payload.fieldB).to.equal(2);
  });
});
