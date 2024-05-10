import '@vitest/web-worker';

import { config } from '../../test/fixtures/config';
import { credentials1 } from '../../test/fixtures/credentialsProvider';

import { getEventHeaders } from './headerUtils';

describe('headerUtils', () => {
  it('verify that event headers contain both default and supplied headers', () => {
    const headers = getEventHeaders({
      appInfo: config.appInfo,
      consentCategory: 'NECESSARY',
      credentials: credentials1,
      platformData: config.platform,
      sentTimestamp: 2023,
      suppliedHeaders: {
        someXtraHeader: 'eggs',
      },
    });
    expect(headers).toEqual({
      'app-name': config.appInfo.appName,
      'app-version': config.appInfo.appVersion,
      authorization: credentials1.token,
      'browser-name': config.platform.browserName,
      'browser-version': config.platform.browserVersion,
      'client-id': 'fakeClientId',
      'consent-category': 'NECESSARY',
      'os-name': config.platform.osName,
      'requested-sent-timestamp': 2023,
      someXtraHeader: 'eggs',
    });
  });

  it('verify that supplied header override default one', () => {
    const headers = getEventHeaders({
      appInfo: config.appInfo,
      consentCategory: 'NECESSARY',
      credentials: credentials1,
      platformData: config.platform,
      sentTimestamp: 2023,
      suppliedHeaders: {
        'app-name': 'bacon',
        someXtraHeader: 'eggs',
      },
    });
    expect(headers['app-name']).toEqual('bacon');
    expect(headers.someXtraHeader).toEqual('eggs');
  });
});
