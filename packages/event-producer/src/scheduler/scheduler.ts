import { getConfig } from '../config';
import { sendMonitoringInfo } from '../monitor';
import { submitEvents } from '../submit/submit';

const ThirtySeconds = 30 * 1000;
const SixtySeconds = 60 * 1000;

let eventBatchIntervalRef: NodeJS.Timeout;
let monitoringInterval: NodeJS.Timeout;

/**
 * Initializes the scheduler.
 * Schedules event submission and monitoring information sending.
 */
export const init = () => {
  if (eventBatchIntervalRef) {
    clearInterval(eventBatchIntervalRef);
  }
  eventBatchIntervalRef = setInterval(() => {
    submitEvents({ config: getConfig() }).catch(console.error);
  }, ThirtySeconds);

  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  monitoringInterval = setInterval(() => {
    sendMonitoringInfo().catch(console.error);
  }, SixtySeconds);
};
