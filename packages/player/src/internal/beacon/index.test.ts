import { expect } from 'chai';
import * as sinon from 'sinon';

import * as Player from '../../index';
import { credentialsProvider } from '../../test-helpers';
import type { StreamingSessionStart } from '../event-tracking/streaming-metrics/streaming-session-start';

import { commit } from './index';

Player.setCredentialsProvider(credentialsProvider);

describe('commit', () => {
  const worker = sinon.createStubInstance(Worker);

  const mockedPromisedEvent = Promise.resolve({
    name: 'streaming_session_start',
    payload: {
      abTestGroup: null,
      abTestName: null,
      browser: 'Chrome',
      browserVersion: '118.0.0.0',
      hardwarePlatform: 'WEB',
      isOfflineModeStart: false,
      mobileNetworkType: null,
      networkType: 'WIFI',
      operatingSystem: 'macOS',
      operatingSystemVersion: '10.15.7',
      screenHeight: 1080,
      screenWidth: 1920,
      startReason: 'EXPLICIT',
      streamingSessionId: '0ba78abd-0b01-45a4-bd30-c7480f5862ee',
      timestamp: 1697450803445,
    },
  } as StreamingSessionStart);

  it('adds accessToken and clientId to data', async () => {
    const message = await commit(worker, {
      events: [mockedPromisedEvent],
      type: 'play_log',
    });

    if (!message) {
      throw new Error(
        'Worker did not response with message, cannot fulfill test',
      );
    }

    expect(message.accessToken).to.not.be.undefined;
    expect(message.clientId).to.not.be.undefined;
  });

  it('calls postMessage on worker', () => {
    commit(worker, { events: [mockedPromisedEvent], type: 'play_log' });

    expect(worker.postMessage.called).to.equal(true);
  });
});
