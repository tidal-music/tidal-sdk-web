import { type Config, getConfig } from '../config.js';
import { sendMonitoringInfo } from '../monitor/index.js';
import { submitEvents } from '../submit/submit.js';

const ThirtySeconds = 30 * 1000;
const SixtySeconds = 60 * 1000;

let eventBatchIntervalRef: ReturnType<typeof setInterval>;
let monitoringIntervalRef: ReturnType<typeof setInterval>;

/**
 * Initializes the scheduler.
 * Schedules event submission and monitoring information sending.
 */
export const init = (config: Config) => {
  if (eventBatchIntervalRef) {
    clearInterval(eventBatchIntervalRef);
  }

  const eventBatchInterval = config?.eventBatchInterval ?? ThirtySeconds;

  eventBatchIntervalRef = setInterval(() => {
    submitEvents({ config: getConfig() }).catch(console.error);
  }, eventBatchInterval);

  if (monitoringIntervalRef) {
    clearInterval(monitoringIntervalRef);
  }

  const monitoringInterval = config?.monitoringInterval ?? SixtySeconds;

  monitoringIntervalRef = setInterval(() => {
    sendMonitoringInfo().catch(console.error);
  }, monitoringInterval);
};
