import '@vitest/web-worker';

import { config } from '../test/fixtures/config.js';

import * as configModule from './config.js';
import * as monitor from './monitor/index.js';
import * as queue from './queue/queue.js';
import * as send from './send/send.js';
import * as submit from './submit/submit.js';

import { flush, sendEvent } from './index.js';

vi.mock('./submit/submit');
vi.mock('./send/send');
vi.mock('./queue/queue');
vi.mock('./monitor/index');

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

    await expect(flush()).resolves.toEqual({ discarded: 0 });

    expect(submit.submitEvents).toHaveBeenCalledTimes(1);
    expect(submit.submitEvents).toHaveBeenCalledWith({ config });
    expect(queue.clearEvents).not.toHaveBeenCalled();
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
    expect(queue.clearEvents).not.toHaveBeenCalled();
  });
});

describe('flush({ discardUnsent: true })', () => {
  beforeEach(() => {
    configModule.init(config);
    vi.stubGlobal('console', { error: vi.fn() });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('submits first, then discards whatever is left and reports the count', async () => {
    const order: Array<string> = [];
    vi.mocked(submit.submitEvents).mockImplementation(async () => {
      order.push('submit');
    });
    vi.mocked(queue.clearEvents).mockImplementation(async () => {
      order.push('clear');
      return 3;
    });

    await expect(flush({ discardUnsent: true })).resolves.toEqual({
      discarded: 3,
    });

    expect(order).toEqual(['submit', 'clear']);
    expect(submit.submitEvents).toHaveBeenCalledWith({ config });
    expect(monitor.resetMonitoringState).toHaveBeenCalledTimes(1);
  });

  it('still discards when submission fails (e.g. nobody is logged in)', async () => {
    const error = new Error('not logged in');
    vi.mocked(submit.submitEvents).mockRejectedValue(error);
    vi.mocked(queue.clearEvents).mockResolvedValue(5);

    await expect(flush({ discardUnsent: true })).resolves.toEqual({
      discarded: 5,
    });

    expect(queue.clearEvents).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      'flush: could not submit queued events:',
      error,
    );
  });

  it('waits for in-progress sendEvent calls before submitting and discarding', async () => {
    vi.mocked(submit.submitEvents).mockResolvedValue(undefined);
    vi.mocked(queue.clearEvents).mockResolvedValue(0);
    let resolveSend: () => void = () => {};
    vi.mocked(send.sendEvent).mockReturnValue(
      new Promise(resolve => {
        resolveSend = () => resolve(undefined);
      }),
    );

    sendEvent({ consentCategory: 'NECESSARY', name: 'late', payload: {} });
    const flushing = flush({ discardUnsent: true });

    await Promise.resolve();
    expect(submit.submitEvents).not.toHaveBeenCalled();
    expect(queue.clearEvents).not.toHaveBeenCalled();

    resolveSend();
    await flushing;

    expect(submit.submitEvents).toHaveBeenCalledTimes(1);
    expect(queue.clearEvents).toHaveBeenCalledTimes(1);
  });

  it('rejects if the persisted queue could not be cleared', async () => {
    vi.mocked(submit.submitEvents).mockResolvedValue(undefined);
    const error = new Error('Failed to clear queue db');
    vi.mocked(queue.clearEvents).mockRejectedValue(error);

    await expect(flush({ discardUnsent: true })).rejects.toBe(error);
  });
});
