import { config } from '../../test/fixtures/config';
import { credentialsProvider1 } from '../../test/fixtures/credentialsProvider';
import { eventPayload1 } from '../../test/fixtures/events';
import * as monitor from '../monitor';
import * as queue from '../queue';
import { init as initUUID } from '../uuid/uuid';

import { type DispatchEventParams, dispatchEvent } from './dispatch';

vi.mock('../monitor');
vi.mock('../queue');
vi.mock('@tidal-music/true-time', () => ({
  trueTime: { now: vi.fn(() => 1337) },
}));

describe('dispatchEvent', () => {
  beforeEach(async () => {
    await initUUID();
  });
  it('if event consentCategory is not blacklisted -> adds event to queue', async () => {
    const dispatchEventPayload: DispatchEventParams = {
      config,
      credentialsProvider: credentialsProvider1,
      event: eventPayload1,
    };
    await dispatchEvent(dispatchEventPayload);

    expect(queue.addEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: JSON.stringify(dispatchEventPayload.event),
      }),
    );
  });

  it('if event consentCategory is blacklisted -> monitor called', async () => {
    const dispatchEventPayload: DispatchEventParams = {
      config,
      credentialsProvider: credentialsProvider1,
      event: {
        ...eventPayload1,
        consentCategory: 'TARGETING',
      },
    };
    await dispatchEvent(dispatchEventPayload);

    expect(queue.addEvent).not.toHaveBeenCalled();
    expect(monitor.registerDroppedEvent).toHaveBeenCalledOnce();
  });
});
