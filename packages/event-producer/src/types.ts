import type { ConsentCategory } from './blockedConsentCategories';

export type * from './blockedConsentCategories';
export type * from './config';

export type AppInfo = {
  appName: string;
  appVersion: string;
};

export type EventHeaders = Record<string, string>;

/**
 * This is an incoming raw event.
 */
export type DispatchedEvent = {
  consentCategory: ConsentCategory;
  headers?: EventHeaders;
  name: string;
  payload: Record<string, unknown>;
};

/**
 * This is an outgoing prepared event.
 */
export type EPEvent = Omit<DispatchedEvent, 'consentCategory' | 'payload'> & {
  id: string;
  payload: string;
};

/**
 * Platform data like browser name, version, etc.
 */
export type PlatformData = {
  browserName: string;
  browserVersion: string;
  deviceVendor: string;
  model: string;
  osName: string;
  version: string;
};
