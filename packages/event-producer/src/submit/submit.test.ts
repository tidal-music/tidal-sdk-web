import '@vitest/web-worker';
import { js2xml } from 'xml-js';

import { config } from '../../test/fixtures/config';
import { epEvent1 } from '../../test/fixtures/events';
import * as monitor from '../monitor';
import * as outage from '../outage';
import * as queue from '../queue';

import { submitEvents } from './submit';

vi.mock('../queue');
vi.mock('../monitor');

describe.sequential('submit', () => {
  beforeEach(() => {
    vi.mocked(queue).getEvents.mockReturnValue([]);
    vi.mocked(queue).getEventBatch.mockReturnValue([]);
  });

  it('fails to send if no credentialsProvider is set', async () => {
    vi.mocked(queue).getEventBatch.mockReturnValue([epEvent1]);

    const _config = {
      ...config,
      credentialsProvider: undefined,
    };

    await expect(() => submitEvents({ config: _config })).rejects.toThrowError(
      'CredentialsProvider not set',
    );
  });

  it('takes a batch of events and posts them to backend, then removes successfully submitted events', async () => {
    vi.mocked(queue).getEventBatch.mockReturnValue([epEvent1]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            `<?xml version="1.0"?><SendMessageBatchResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/"><SendMessageBatchResult><SendMessageBatchResultEntry><Id>${epEvent1.id}</Id><MessageId>dd618ee4-757e-4fee-b6ad-1ba3eb1aacbf</MessageId><MD5OfMessageBody>01080246ed7d69ab921c2bad3e710c4b</MD5OfMessageBody><MD5OfMessageAttributes>d8e23fb0ae3a631c872657d51ba816be</MD5OfMessageAttributes></SendMessageBatchResultEntry></SendMessageBatchResult></SendMessageBatchResponse>`,
          ),
      }),
    );
    await submitEvents({ config });

    expect(fetch).toHaveBeenCalledWith(
      config.tlConsumerUri,
      expect.objectContaining({
        body: expect.any(URLSearchParams),
        headers: expect.any(Headers),
        method: 'post',
      }),
    );

    expect(queue.removeEvents).toHaveBeenCalledWith([epEvent1.id]);
  });

  it('takes a batch of max 10 events, and does not setOutage if not isOutage', async () => {
    vi.spyOn(outage, 'setOutage');
    const events = Array.from({ length: 666 }, (_, i) => ({
      ...epEvent1,
      id: `${i}`,
    }));
    const first10Events = events.slice(0, 10);

    const xmlrespons = js2xml(
      {
        xml: {
          SendMessageBatchResponse: {
            SendMessageBatchResult: first10Events.map(e => ({
              SendMessageBatchResultEntry: { Id: e.id },
            })),
          },
        },
      },
      { compact: true },
    );

    vi.mocked(queue).getEventBatch.mockReturnValue(events);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(xmlrespons),
      }),
    );
    await submitEvents({ config });

    expect(fetch).toHaveBeenCalledWith(
      config.tlConsumerUri,
      expect.objectContaining({
        body: expect.any(URLSearchParams),
        headers: expect.any(Headers),
        method: 'post',
      }),
    );

    expect(queue.removeEvents).toHaveBeenCalledWith(
      first10Events.map(e => e.id),
    );

    expect(outage.setOutage).not.toHaveBeenCalled();
  });

  it('recursive calls until empty', async () => {
    const events = Array.from({ length: 21 }, (_, i) => ({
      ...epEvent1,
      id: `${i}`,
    }));
    const firstBatch = events.slice(0, 10);
    const secondBatch = events.slice(10, 20);
    const lastBatch = events.slice(20, 21);

    const [firstResponse, secondResponse, lastResponse] = [
      firstBatch,
      secondBatch,
      lastBatch,
    ].map(batch =>
      js2xml(
        {
          xml: {
            SendMessageBatchResponse: {
              SendMessageBatchResult: batch.map(e => ({
                SendMessageBatchResultEntry: { Id: e.id },
              })),
            },
          },
        },
        { compact: true },
      ),
    );

    vi.mocked(queue).getEventBatch.mockReturnValueOnce(firstBatch);
    vi.mocked(queue).getEventBatch.mockReturnValueOnce(secondBatch);
    vi.mocked(queue).getEventBatch.mockReturnValueOnce(lastBatch);

    vi.mocked(queue).getEvents.mockReturnValueOnce(events);
    vi.mocked(queue).getEvents.mockReturnValueOnce(
      secondBatch.concat(lastBatch),
    );
    vi.mocked(queue).getEvents.mockReturnValueOnce(lastBatch);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue(firstResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue(secondResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: vi.fn().mockResolvedValue(lastResponse),
        }),
    );
    await submitEvents({ config });

    expect(fetch).toHaveBeenCalledWith(
      config.tlConsumerUri,
      expect.objectContaining({
        body: expect.any(URLSearchParams),
        headers: expect.any(Headers),
        method: 'post',
      }),
    );

    expect(fetch).toHaveBeenCalledTimes(3);

    expect(queue.removeEvents).toHaveBeenCalledWith(firstBatch.map(e => e.id));
    expect(queue.removeEvents).toHaveBeenCalledWith(secondBatch.map(e => e.id));
    expect(queue.removeEvents).toHaveBeenCalledWith(lastBatch.map(e => e.id));
  });

  it('does not submit events if there are no events in the queue', async () => {
    vi.spyOn(globalThis, 'fetch');
    vi.mocked(queue).getEventBatch.mockReturnValue([]);
    await submitEvents({ config });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('sets outage flag to false if isOutage events are sendt successfully', async () => {
    vi.spyOn(outage, 'setOutage');
    vi.spyOn(outage, 'isOutage').mockReturnValue(true);
    vi.mocked(queue).getEventBatch.mockReturnValue([epEvent1]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            `<?xml version="1.0"?><SendMessageBatchResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/"><SendMessageBatchResult><SendMessageBatchResultEntry><Id>${epEvent1.id}</Id><MessageId>dd618ee4-757e-4fee-b6ad-1ba3eb1aacbf</MessageId><MD5OfMessageBody>01080246ed7d69ab921c2bad3e710c4b</MD5OfMessageBody><MD5OfMessageAttributes>d8e23fb0ae3a631c872657d51ba816be</MD5OfMessageAttributes></SendMessageBatchResultEntry></SendMessageBatchResult></SendMessageBatchResponse>`,
          ),
      }),
    );
    await submitEvents({ config });

    expect(outage.setOutage).toHaveBeenCalledWith(false);
  });

  it('sets outage flag to true if isOutage === true & events are not sendt successfully', async () => {
    vi.spyOn(outage, 'setOutage');
    vi.spyOn(outage, 'isOutage').mockReturnValue(true);
    vi.mocked(queue).getEventBatch.mockReturnValue([epEvent1]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue(''),
      }),
    );
    await submitEvents({ config });

    expect(outage.setOutage).toHaveBeenCalledWith(true);
  });

  it('response with BatchResultErrorEntry drops events if SenderFault === true', async () => {
    vi.mocked(queue).getEventBatch.mockReturnValue([epEvent1]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            `<?xml version="1.0"?><SendMessageBatchResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/"><SendMessageBatchResult><BatchResultErrorEntry><Id>${epEvent1.id}</Id><SenderFault>true</SenderFault></BatchResultErrorEntry></SendMessageBatchResult></SendMessageBatchResponse>`,
          ),
      }),
    );
    await submitEvents({ config });

    expect(fetch).toHaveBeenCalledWith(
      config.tlConsumerUri,
      expect.objectContaining({
        body: expect.any(URLSearchParams),
        headers: expect.any(Headers),
        method: 'post',
      }),
    );

    expect(monitor.registerDroppedEvent).toHaveBeenCalledWith({
      eventName: epEvent1.name,
      reason: 'validationFailedEvents',
    });
    expect(queue.removeEvents).toHaveBeenCalledWith([epEvent1.id]);
  });

  it('response with BatchResultErrorEntry keeps event if SenderFault === false', async () => {
    vi.mocked(queue).getEventBatch.mockReturnValue([epEvent1]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi
          .fn()
          .mockResolvedValue(
            `<?xml version="1.0"?><SendMessageBatchResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/"><SendMessageBatchResult><BatchResultErrorEntry><Id>${epEvent1.id}</Id><SenderFault>false</SenderFault></BatchResultErrorEntry></SendMessageBatchResult></SendMessageBatchResponse>`,
          ),
      }),
    );
    await submitEvents({ config });

    expect(fetch).toHaveBeenCalledWith(
      config.tlConsumerUri,
      expect.objectContaining({
        body: expect.any(URLSearchParams),
        headers: expect.any(Headers),
        method: 'post',
      }),
    );

    expect(monitor.registerDroppedEvent).not.toHaveBeenCalled();
    expect(queue.removeEvents).toHaveBeenCalledWith([]);
  });

  it('error response with AWS.SimpleQueueService.BatchEntryIdsNotDistinct removes duplicates', async () => {
    vi.mocked(queue).getEventBatch.mockReturnValue([epEvent1, epEvent1]);
    vi.mocked(queue).getEvents.mockReturnValue([epEvent1, epEvent1]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        text: vi
          .fn()
          .mockResolvedValueOnce(
            '<?xml version="1.0"?><ErrorResponse xmlns="http://queue.amazonaws.com/doc/2012-11-05/"><Error><Type>Sender</Type><Code>AWS.SimpleQueueService.BatchEntryIdsNotDistinct</Code><Message>Id a6f4964d-63da-4d66-86bf-e9155b4bb499 repeated.</Message><Detail/></Error><RequestId>635d186a-54a0-52e5-b8c0-4601e8f85440</RequestId></ErrorResponse>',
          ),
      }),
    );

    await submitEvents({ config });

    expect(queue.setEvents).toHaveBeenCalledWith([epEvent1]);
  });
});
