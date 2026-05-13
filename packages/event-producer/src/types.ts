import type { ConsentCategory } from './blockedConsentCategories.js';

export type * from './blockedConsentCategories.js';
export type * from './config.js';

export type AppInfo = {
  appName: string;
  appVersion: string;
};

export type EventHeaders = Record<string, number | string>;

/**
 * This is an incoming raw event.
 */
export type SentEvent = {
  consentCategory: ConsentCategory;
  headers?: EventHeaders;
  name: string;
  payload: Record<string, unknown>;
};

/**
 * This is an outgoing prepared event.
 */
export type EPEvent = Omit<SentEvent, 'consentCategory' | 'payload'> & {
  id: string;
  payload: string;
};

/**
 * Platform data like browser name, version, etc.
 */
export type PlatformData = {
  browserName: string;
  browserVersion: string;
  osName: string;
};
