import type { Credentials } from '@tidal-music/common';

import type { ConsentCategory } from '../blockedConsentCategories';
import type { AppInfo, EventHeaders, PlatformData } from '../types';

export const getEventHeaders = ({
  appInfo: { appName, appVersion },
  authorize = true,
  consentCategory,
  credentials,
  platformData: { browserName, browserVersion, osName },
  sentTimestamp,
  suppliedHeaders,
}: {
  appInfo: AppInfo;
  authorize?: boolean;
  consentCategory: ConsentCategory;
  credentials?: Credentials;
  platformData: PlatformData;
  sentTimestamp: number;
  suppliedHeaders?: Record<string, number | string>;
}) => {
  const accessToken = credentials?.token;
  const clientId = credentials?.clientId ?? 'clientIDMissing!';

  const headers: EventHeaders = {
    'app-name': appName,
    'app-version': appVersion,
    'browser-name': browserName,
    'browser-version': browserVersion,
    'client-id': clientId,
    'consent-category': consentCategory,
    'os-name': osName,
    'requested-sent-timestamp': sentTimestamp,
  };

  if (authorize && accessToken) {
    headers.authorization = accessToken;
  }

  if (suppliedHeaders) {
    Object.entries(suppliedHeaders).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  return headers;
};
