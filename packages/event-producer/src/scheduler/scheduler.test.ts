import { config } from '../../test/fixtures/config';
import { init as initConfig } from '../config';
import * as monitor from '../monitor';
import * as submit from '../submit/submit';

import * as scheduler from './scheduler';

vi.useFakeTimers();
describe('Scheduler', () => {
  beforeEach(() => {
    initConfig(config);
    vi.stubGlobal('console', { error: vi.fn() });
  });
  it('calls sendEvents every given interval', async () => {
    vi.spyOn(submit, 'submitEvents');
    vi.spyOn(monitor, 'sendMonitoringInfo');

    scheduler.init();

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
    scheduler.init();

    await vi.advanceTimersByTimeAsync(30000);

    expect(submit.submitEvents).toHaveBeenCalledWith({ config });
    expect(console.error).toHaveBeenCalledWith(fakeError);
  });
});
