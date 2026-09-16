import '@vitest/web-worker';

import { config } from '../../test/fixtures/config.js';
import { epEvent1 } from '../../test/fixtures/events.js';
import { init as initConfig } from '../config.js';
import * as monitor from '../monitor/index.js';
import * as queue from '../queue/index.js';
import * as submit from '../submit/submit.js';

import * as scheduler from './scheduler.js';

vi.useFakeTimers();
describe.sequential('Scheduler', () => {
  beforeEach(() => {
    initConfig(config);
    vi.stubGlobal('console', { error: vi.fn() });
  });
  it('calls sendEvents every given interval', async () => {
    vi.spyOn(submit, 'submitEvents');
    vi.spyOn(monitor, 'sendMonitoringInfo');

    scheduler.init(config);

    expect(submit.submitEvents).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(30000);
    expect(monitor.sendMonitoringInfo).not.toHaveBeenCalled();
    expect(submit.submitEvents).toHaveBeenCalledWith({ config });

    await vi.advanceTimersByTimeAsync(30000);

    expect(monitor.sendMonitoringInfo).toHaveBeenCalled();
  });

  it('logs errors', async () => {
    vi.spyOn(submit, 'submitEvents');

    const fakeError = new Error('you borked it!');
    vi.mocked(submit.submitEvents).mockRejectedValueOnce(fakeError);
    scheduler.init(config);

    await vi.advanceTimersByTimeAsync(30000);

    expect(submit.submitEvents).toHaveBeenCalledWith({ config });
    expect(console.error).toHaveBeenCalledWith(fakeError);
  });

  it('does not start a second submit while one is still in flight', async () => {
    vi.spyOn(submit, 'submitEvents');
    vi.spyOn(queue, 'getEventBatch').mockReturnValue([epEvent1]);
    // hold the fetch open so the first submit stays in flight across ticks
    let resolveFetch: (value: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise(resolve => {
          resolveFetch = resolve;
        }),
      ),
    );

    scheduler.init(config);

    await vi.advanceTimersByTimeAsync(30000);
    await vi.advanceTimersByTimeAsync(30000);
    await vi.advanceTimersByTimeAsync(30000);

    expect(submit.submitEvents).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledTimes(1);

    // finish the run so it does not stay in flight for later tests
    resolveFetch({ ok: false, text: vi.fn().mockResolvedValue('') });
    await vi.advanceTimersByTimeAsync(0);
  });

  it('interval is configurable', async () => {
    vi.spyOn(submit, 'submitEvents');
    vi.spyOn(monitor, 'sendMonitoringInfo');

    scheduler.init({
      ...config,
      eventBatchInterval: 666,
      monitoringInterval: 667,
    });

    expect(submit.submitEvents).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(666);
    expect(monitor.sendMonitoringInfo).not.toHaveBeenCalled();
    expect(submit.submitEvents).toHaveBeenCalledWith({ config });

    await vi.advanceTimersByTimeAsync(1);

    expect(monitor.sendMonitoringInfo).toHaveBeenCalled();
  });
});
