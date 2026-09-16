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

  it('propagates submit rejections to the caller', async () => {
    const error = new Error('CredentialsProvider not set');
    vi.mocked(submit.submitEvents).mockRejectedValue(error);

    await expect(flush()).rejects.toBe(error);
  });
});
