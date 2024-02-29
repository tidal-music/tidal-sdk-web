import type { TidalMessage } from '@tidal-music/common';

import * as bus from './bus';

describe('bus', () => {
  it('bus adds event listener on globalThis', () => {
    const addEventListener = vi.spyOn(globalThis, 'addEventListener');
    const callback = vi.fn();
    bus.bus(callback);
    expect(addEventListener).toHaveBeenCalledWith(
      'eventProducerEventBus',
      callback,
    );
  });

  it('should dispatch custom event on globalThis', () => {
    const dispatchEvent = vi.spyOn(globalThis, 'dispatchEvent');
    const callback = vi.fn();
    bus.bus(callback);
    const message: TidalMessage = { name: 'test' };
    bus.postMessage(message);
    const event = dispatchEvent.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toEqual(message);
  });
});
