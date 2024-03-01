import { type Config } from '../../src';

import { credentialsProvider1 } from './credentialsProvider';

export const config: Config = {
  appInfo: { appName: 'withJoy', appVersion: '777' },
  blockedConsentCategories: {
    NECESSARY: false,
    PERFORMANCE: false,
    TARGETING: true,
  },
  credentialsProvider: credentialsProvider1,
  platform: {
    browserName: 'brave',
    browserVersion: 'final.final.final',
    osName: 'Bic Mac',
  },
  tlConsumerUri: '/api/event-batch',
  tlPublicConsumerUri: '/api/public/event-batch',
};
