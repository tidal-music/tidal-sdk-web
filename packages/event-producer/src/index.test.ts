import '@vitest/web-worker';

import { config } from '../test/fixtures/config.js';

import * as configModule from './config.js';
import * as send from './send/send.js';
import * as submit from './submit/submit.js';

import { flush, sendEvent } from './index.js';

vi.mock('./submit/submit');
vi.mock('./send/send');

describe('sendEvent', () => {
  const event = {
    consentCategory: 'NECESSARY' as const,
    name: 'test',
    payload: {},
  };

  beforeEach(() => {
    configModule.init(config);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('forwards the event with the current config and credentials provider', () => {
    vi.mocked(send.sendEvent).mockResolvedValue(undefined);

    sendEvent(event);

    expect(send.sendEvent).toHaveBeenCalledWith({
      config,
      credentialsProvider: config.credentialsProvider,
      event,
    });
  });

  it('throws if no credentials provider is set', () => {
    configModule.init({ ...config, credentialsProvider: undefined });

    expect(() => sendEvent(event)).toThrow('CredentialsProvider not set');
    expect(send.sendEvent).not.toHaveBeenCalled();
  });
});

describe('flush', () => {
  beforeEach(() => {
    configModule.init(config);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('submits the queue with the current config and resolves when done', async () => {
    vi.mocked(submit.submitEvents).mockResolvedValue(undefined);

    await expect(flush()).resolves.toBeUndefined();

    expect(submit.submitEvents).toHaveBeenCalledTimes(1);
    expect(submit.submitEvents).toHaveBeenCalledWith({ config });
  });

  it('uses the config as it is at call time', async () => {
    vi.mocked(submit.submitEvents).mockResolvedValue(undefined);
    const otherProvider = {
      bus: () => {},
      getCredentials: vi.fn(),
    };
    configModule.setCredentialsProvider(otherProvider);

    await flush();

    expect(submit.submitEvents).toHaveBeenCalledWith({
      config: expect.objectContaining({ credentialsProvider: otherProvider }),
    });
  });

  it('waits for sendEvent calls that have not reached the queue yet', async () => {
    vi.mocked(submit.submitEvents).mockResolvedValue(undefined);
    let resolveSend: () => void = () => {};
    vi.mocked(send.sendEvent).mockReturnValue(
      new Promise(resolve => {
        resolveSend = () => resolve(undefined);
      }),
    );

    sendEvent({ consentCategory: 'NECESSARY', name: 'late', payload: {} });
    let flushed = false;
    const flushing = flush().then(() => {
      flushed = true;
    });

    await Promise.resolve();
    expect(submit.submitEvents).not.toHaveBeenCalled();
    expect(flushed).toBe(false);

    resolveSend();
    await flushing;

    expect(submit.submitEvents).toHaveBeenCalledTimes(1);
  });

  it('is not blocked by a sendEvent that fails', async () => {
    vi.stubGlobal('console', { error: vi.fn() });
    vi.mocked(submit.submitEvents).mockResolvedValue(undefined);
    vi.mocked(send.sendEvent).mockRejectedValue(new Error('bad event'));

    sendEvent({ consentCategory: 'NECESSARY', name: 'bad', payload: {} });
    await flush();

    expect(submit.submitEvents).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(new Error('bad event'));
  });

  it('propagates submit rejections to the caller', async () => {
    const error = new Error('CredentialsProvider not set');
    vi.mocked(submit.submitEvents).mockRejectedValue(error);

    await expect(flush()).rejects.toBe(error);
  });
});
