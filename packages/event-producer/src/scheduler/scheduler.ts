import { type Config, getConfig } from '../config';
import { sendMonitoringInfo } from '../monitor';
import { submitEvents } from '../submit/submit';

const ThirtySeconds = 30 * 1000;
const SixtySeconds = 60 * 1000;

let eventBatchIntervalRef: NodeJS.Timeout;
let monitoringIntervalRef: NodeJS.Timeout;

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
