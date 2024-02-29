import '@vitest/web-worker';
import { trueTime } from '@tidal-music/true-time';

import { config } from '../../test/fixtures/config';
import { init } from '../config';
import * as sqsParamsConverter from '../utils/sqsParamsConverter';

import * as monitor from './';

describe.sequential('monitor', () => {
  beforeEach(() => {
    init(config);
    monitor.resetMonitoringState();
  });
  it('registers dropped event', async () => {
    monitor.registerDroppedEvent({
      eventName: 'event1',
      reason: 'consentFilteredEvents',
    });
    expect(monitor._monitoringInfo.consentFilteredEvents.event1).toBe(1);
  });

  it('sends monitoring info', async () => {
    vi.spyOn(trueTime, 'now').mockReturnValue(123456789);
    vi.spyOn(sqsParamsConverter, 'eventsToSqsRequestParameters');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    monitor.registerDroppedEvent({
      eventName: 'event1',
      reason: 'consentFilteredEvents',
    });

    await monitor.sendMonitoringInfo();

    expect(
      sqsParamsConverter.eventsToSqsRequestParameters,
    ).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'tep-tl-monitoring',
          payload: expect.stringContaining(
            JSON.stringify({
              consentFilteredEvents: { event1: 1 },
              storingFailedEvents: {},
              validationFailedEvents: {},
            }),
          ),
        }),
      ]),
    );
    expect(fetch).toHaveBeenCalledWith(
      config.tlPublicConsumerUri,
      expect.objectContaining({
        method: 'post',
      }),
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call
    const messageBody = (
      vi.mocked(fetch).mock.calls[0]?.[1]?.body as URLSearchParams | undefined
    )?.get('SendMessageBatchRequestEntry.1.MessageBody');

    expect(messageBody).toMatch('"consentFilteredEvents":{"event1":1}');
  });
});
