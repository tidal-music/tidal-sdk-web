import '@vitest/web-worker';

import { config } from '../../test/fixtures/config.js';
import { credentialsProvider1 } from '../../test/fixtures/credentialsProvider.js';
import { eventPayload1 } from '../../test/fixtures/events.js';
import * as monitor from '../monitor/index.js';
import * as queue from '../queue/index.js';
import * as uuid from '../uuid/uuid.js';

import { type SendEventParams, sendEvent } from './send.js';

vi.mock('../monitor');
vi.mock('../queue');
vi.mock('@tidal-music/true-time', () => ({
  trueTime: { now: vi.fn(() => 1337) },
}));

describe.sequential('sendEvent', () => {
  beforeEach(async () => {
    await uuid.init();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it('if event consentCategory is not blocked -> adds event to queue', async () => {
    vi.spyOn(uuid, 'uuid').mockReturnValue('fakeUuid');
    const sendEventPayload: SendEventParams = {
      config,
      credentialsProvider: credentialsProvider1,
      event: eventPayload1,
    };
    await sendEvent(sendEventPayload);
    const { consentCategory, ...eventWithoutConsentCategory } =
      sendEventPayload.event;
    expect(queue.addEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: JSON.stringify({
          ...eventWithoutConsentCategory,
          ts: 1337,
          uuid: 'fakeUuid',
        }),
      }),
    );
  });

  it('if event consentCategory is blocked -> monitor called', async () => {
    const sendEventPayload: SendEventParams = {
      config,
      credentialsProvider: credentialsProvider1,
      event: {
        ...eventPayload1,
        consentCategory: 'TARGETING',
      },
    };
    await sendEvent(sendEventPayload);

    expect(queue.addEvent).not.toHaveBeenCalled();
    expect(monitor.registerDroppedEvent).toHaveBeenCalledOnce();
  });
});
