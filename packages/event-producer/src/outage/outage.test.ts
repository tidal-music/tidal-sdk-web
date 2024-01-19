import * as bus from '../bus';

import * as outage from './index';

describe('outage', () => {
  it('sets outage state true and posts messages to the bus.', () => {
    const busSpy = vi.spyOn(bus, 'postMessage');
    outage.setOutage(true);
    expect(outage.isOutage()).toBe(true);

    expect(busSpy).toHaveBeenCalledWith(new outage.OutageStartError('1'));

    outage.setOutage(false);
    expect(outage.isOutage()).toBe(false);
    expect(busSpy).toHaveBeenCalledWith(outage.OutageEndMessage);
  });
});
