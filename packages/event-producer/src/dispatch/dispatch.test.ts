import '@vitest/web-worker';

import { config } from '../../test/fixtures/config';
import { credentialsProvider1 } from '../../test/fixtures/credentialsProvider';
import { eventPayload1 } from '../../test/fixtures/events';
import * as monitor from '../monitor';
import * as queue from '../queue';
import * as uuid from '../uuid/uuid';

import { type DispatchEventParams, dispatchEvent } from './dispatch';

vi.mock('../monitor');
vi.mock('../queue');
vi.mock('@tidal-music/true-time', () => ({
  trueTime: { now: vi.fn(() => 1337) },
}));

describe('dispatchEvent', () => {
  beforeEach(async () => {
    await uuid.init();
  });
  it('if event consentCategory is not blocked -> adds event to queue', async () => {
    vi.spyOn(uuid, 'uuid').mockReturnValue('fakeUuid');
    const dispatchEventPayload: DispatchEventParams = {
      config,
      credentialsProvider: credentialsProvider1,
      event: eventPayload1,
    };
    await dispatchEvent(dispatchEventPayload);
    const { consentCategory, ...eventWithoutConsentCategory } =
      dispatchEventPayload.event;
    expect(queue.addEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: JSON.stringify({
          ...eventWithoutConsentCategory,
          ts: '1337',
          uuid: 'fakeUuid',
        }),
      }),
    );
  });

  it('if event consentCategory is blocked -> monitor called', async () => {
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
