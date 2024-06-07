import { trueTime } from '@tidal-music/true-time';

import * as config from './config';
import * as queue from './queue';
import * as scheduler from './scheduler/scheduler';
import { init as initUuid } from './uuid/uuid';

/**
 * Initializes the EventProducer and the tools it depends on (uuid, trueTime and the indexedDB).
 * This function must be called before any other function in the EventProducer.
 *
 * @param {config.Config} initialConfig
 */
export const init = async (initialConfig: config.Config) => {
  config.init(initialConfig);
  await Promise.all([
    trueTime.synchronize(),
    initUuid(),
    queue.initDB({ feralEventTypes: initialConfig.feralEventTypes }),
  ]);
  scheduler.init(config.getConfig());
};
