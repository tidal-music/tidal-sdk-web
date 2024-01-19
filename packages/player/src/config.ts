import type { LoudnessNormalizationMode } from './api/interfaces';
import type { AudioQuality } from './internal/types';

type Config = {
  apiUrl: string;
  appVersion: string;
  clientPlatform: string;
  desiredVolumeLevel: number;
  eventUrl: string;
  gatherEvents: boolean;
  loudnessNormalizationMode: LoudnessNormalizationMode;
  outputDevicesEnabled: boolean;
  streamingWifiAudioQuality: AudioQuality;
};

let state = Object.freeze({
  apiUrl: 'https://api.tidal.com/v1',
  appVersion: 'TIDAL Player',
  clientPlatform: 'web',
  desiredVolumeLevel: 1,
  eventUrl: 'https://et.tidal.com/api/events',
  gatherEvents: true,
  loudnessNormalizationMode: 'ALBUM',
  outputDevicesEnabled: false,
  streamingWifiAudioQuality: 'LOW',
} as Config);

export function get<K extends keyof Config>(key: K): Config[K] {
  return state[key];
}

export function update(updates: Partial<Config>): Config {
  state = Object.freeze({
    ...state,
    ...updates,
  });

  Object.keys(updates).forEach(k => {
    const key = k as keyof Config;

    events.dispatchEvent(new CustomEvent(key, { detail: updates[key] }));
  });

  return state;
}

export const events = new EventTarget();
