import { js2xml } from 'xml-js';

import { config } from '../../test/fixtures/config';
import { epEvent1 } from '../../test/fixtures/events';
import * as outage from '../outage';
import * as queue from '../queue';

import { submitEvents } from './submit';

vi.mock('../queue');

describe('submit', () => {
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

  it('sets outage flag to true if isOutage events are not sendt successfully', async () => {
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
});
