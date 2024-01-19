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
    deviceVendor: 'baconfari',
    model: 'the XL',
    osName: 'Bic Mac',
    version: '666',
  },
  tlConsumerUri: '/api/event-batch',
  tlPublicConsumerUri: '/api/public/event-batch',
};
