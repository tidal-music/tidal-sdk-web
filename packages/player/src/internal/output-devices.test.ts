import { expect } from 'chai';

import * as Player from '../';
import { events } from '../event-bus';
import type { NativePlayerComponentDeviceDescription } from '../player/nativeInterface';
import { credentialsProvider } from '../test-helpers';

import {
  OutputDevice,
  OutputDevices,
  findOutputType,
  getOutputDeviceByName,
} from './output-devices';

Player.setCredentialsProvider(credentialsProvider);

beforeEach(async () => {
  await Player.load(
    {
      productId: '141120674',
      productType: 'track',
      sourceId: 'tidal-player-tests',
      sourceType: 'tidal-player-tests',
    },
    0,
  );
});

const defaultWd: MediaDeviceInfo = {
  deviceId: '12d6as',
  groupId: '1',
  kind: 'audiooutput',
  label: 'Derp',
  toJSON: () => '',
};

const wdMock = (fields: Partial<MediaDeviceInfo>) =>
  ({
    ...defaultWd,
    ...fields,
  }) as MediaDeviceInfo;

const defaultNd: NativePlayerComponentDeviceDescription = {
  controllableVolume: false,
  id: '1',
  name: 'Derp',
  type: 'default',
};

const ndMock = (fields: Partial<NativePlayerComponentDeviceDescription>) =>
  ({
    ...defaultNd,
    ...fields,
  }) as NativePlayerComponentDeviceDescription;

describe('findOutputType', () => {
  it('recognizes windows communication device', () => {
    const label = 'Communications - Germanys Saurkraut';
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal('windowsCommunication');
  });

  it('recognizes Bluetooth', () => {
    const label = 'STANMORE Speaker (Bluetooth)'; // Live macos example
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal('bluetooth');
  });

  it('recognizes DisplayPort', () => {
    const label = 'DELL P2715Q (DisplayPort)';
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal('displayPort');
  });

  it('recognizes Built-in', () => {
    const label = 'Högtalare i MacBook Pro (Built-in)'; // Live macos example
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal('builtIn');
  });

  it('recognizes HDMI', () => {
    const label = 'Högtalare i MacBook Pro (HDMI)';
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal('hdmi');
  });

  it('recognizes USB', () => {
    const label = 'Speakers (Zorloo Ztella USB Audio)'; // Live windows example
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal('usb');
  });

  it('recognizes AirPlay', () => {
    const label = 'Kontor+ (AirPlay)';
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal('airplay');
  });

  it('recognizes AirPlay from native player', () => {
    const name = 'Kontor+';
    const result = findOutputType(ndMock({ name, type: 'airplay' }));

    expect(result).to.equal('airplay');
  });

  it('returns undefined if cannot parse', () => {
    const label = 'Sodastream';
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal(undefined);
  });

  it('returns undefined if type cannot be inferred', () => {
    const label = 'Sodastream (CO2 Water)';
    const result = findOutputType(wdMock({ label }));

    expect(result).to.equal(undefined);
  });
});

describe('OutputDevice', () => {
  it('correctly sets properties from parameters in the constructor', () => {
    const device = new OutputDevice({
      controllableVolume: true,
      name: 'Speakers in MacBook',
      nativeDeviceId: '7331',
      type: 'builtIn',
      webDeviceId: '1337',
    });

    expect(device.name).to.equal('Speakers in MacBook');
    expect(device.type).to.equal('builtIn');
    expect(device.webDeviceId).to.equal('1337');
    expect(device.nativeDeviceId).to.equal('7331');
    expect(device.controllableVolume).to.equal(true);
  });

  it('correctly defaults to sane values if not provided', () => {
    const device = new OutputDevice({
      name: 'Speakers in MacBook',
      type: 'builtIn',
    });

    expect(device.name).to.equal('Speakers in MacBook');
    expect(device.type).to.equal('builtIn');
    expect(device.webDeviceId).to.equal(undefined);
    expect(device.nativeDeviceId).to.equal(undefined);
    expect(device.controllableVolume).to.equal(true);
  });
});

describe('OutputDevices', () => {
  const devices = new Set([
    new OutputDevice({
      name: 'My Cool Speaker (Bluetooth)',
      nativeDeviceId: 'native-breaky-superliscous-disher',
      type: 'bluetooth',
      webDeviceId: 'web-breaky-superliscous-disher',
    }),
    new OutputDevice({
      name: 'Germanys Saurkraut (1ff:ss:trrtt)',
      nativeDeviceId: 'native-breaky-supertrouper-booper',
      type: 'mqa',
      webDeviceId: 'web-breaky-supertrouper-booper',
    }),
  ]);

  it('can get a device by name', () => {
    const result = getOutputDeviceByName(devices, 'Germanys Saurkraut');

    if (result) {
      expect(result.nativeDeviceId).to.equal(
        'native-breaky-supertrouper-booper',
      );
      expect(result.webDeviceId).to.equal('web-breaky-supertrouper-booper');
      expect(result.name).to.include('Germanys Saurkraut');
    }
  });

  it('getOutputDeviceByName returns undefined if no devices', () => {
    const result = getOutputDeviceByName(new Set([]), 'Germanys Saurkraut');

    expect(result).to.equal(undefined);
  });

  it('getOutputDeviceByName returns undefined if no device found', () => {
    const result = getOutputDeviceByName(devices, 'Kittycat');

    expect(result).to.equal(undefined);
  });

  it('can detect output type if web device name exposes a clue', () => {
    const before = getOutputDeviceByName(devices, 'My Cool Speaker');

    if (before) {
      expect(before.type).to.equal('bluetooth');
    }
  });

  it('can detect output type if native device is mqa', () => {
    const before = getOutputDeviceByName(devices, 'Germanys Saurkraut');

    if (before) {
      expect(before.type).to.equal('mqa');
    }
  });

  // TODO: Add active device and boot player to fix test.
  it.skip('can change device mode', () => {
    const outputDevices = new OutputDevices();

    expect(outputDevices.deviceMode).to.equal('shared');

    outputDevices.deviceMode = 'exclusive';

    expect(outputDevices.deviceMode).to.equal('exclusive');
  });

  // TODO: Add active device and boot player to fix test.
  it.skip('can change pass through mode', () => {
    const outputDevices = new OutputDevices();

    expect(outputDevices.passThrough).to.equal(undefined);

    outputDevices.passThrough = true;

    expect(outputDevices.passThrough).to.equal(true);
  });

  // eslint-disable-next-line vitest/expect-expect
  it('emits devicechange event when emitDeviceChange is called', done => {
    const outputDevices = new OutputDevices();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    events.addEventListener('device-change', () => done());

    outputDevices.emitDeviceChange();
  });
});
