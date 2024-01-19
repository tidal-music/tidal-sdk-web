import { epEvent1 } from '../../test/fixtures/events';

import { validateEvent } from './validateEvent';

describe('validateEvent', () => {
  it('validates normal event', () => {
    expect(validateEvent(epEvent1)).toEqual(true);
  });

  it('illegal characters in payload', () => {
    const badBoiEvent = {
      ...epEvent1,
      payload: '\uD800badInjection',
    };

    expect(validateEvent(badBoiEvent)).toEqual(false);
  });

  it('payload is more than 20kb', () => {
    const arr = new Array(30000).fill('a');
    const bigBoiEvent = { ...epEvent1, payload: JSON.stringify(arr.join()) };
    expect(validateEvent(bigBoiEvent)).toEqual(false);
  });
});
