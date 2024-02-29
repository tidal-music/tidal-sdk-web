import Bowser from 'bowser';
import levenshtein from 'js-levenshtein';

import { deviceChange } from '../api/event/device-change';
import { events } from '../event-bus';
import type {
  NativePlayerComponentDeviceDescription,
  NativePlayerDeviceMode,
} from '../player/nativeInterface';
import type NativePlayer from '../player/nativePlayer';
import { playerState } from '../player/state';

import { generateGUID } from './helpers/generate-guid';

const platform = Bowser.parse(navigator.userAgent);

export type OutputType =
  | 'airplay'
  | 'bluetooth'
  | 'builtIn'
  | 'displayPort'
  | 'hdmi'
  | 'mqa'
  | 'systemDefault'
  | 'usb'
  | 'windowsCommunication';

export class OutputDevice {
  controllableVolume: boolean;

  id!: string;

  name!: string;

  nativeDeviceId?: string;

  type!: OutputType | undefined;

  webDeviceId?: string;

  constructor({
    controllableVolume,
    name,
    nativeDeviceId,
    type,
    webDeviceId,
  }: {
    controllableVolume?: boolean;
    name: string;
    nativeDeviceId?: string;
    type: OutputType | undefined;
    webDeviceId?: string;
  }) {
    this.name = name;
    this.id =
      nativeDeviceId === 'default' && webDeviceId === 'default'
        ? 'default'
        : generateGUID();
    this.nativeDeviceId = nativeDeviceId;
    this.webDeviceId = webDeviceId;
    this.type = type;
    this.controllableVolume = controllableVolume !== false; // undefined as true
  }
}

export function findOutputType(
  device: MediaDeviceInfo | NativePlayerComponentDeviceDescription,
): OutputType | undefined {
  if (isWindowsCommunicationsDevice(device)) {
    return 'windowsCommunication';
  }

  if ('id' in device && device.id === 'BuiltInSpeakerDevice') {
    return 'builtIn';
  }

  if ('type' in device) {
    if (device.type === 'airplay') {
      return 'airplay';
    }

    if (device.type === 'mqa') {
      return 'mqa';
    }
  }

  if ('label' in device) {
    const label = device.label.toLowerCase();

    if (label.includes('bluetooth')) {
      return 'bluetooth';
    }

    if (label.includes('displayport')) {
      return 'displayPort';
    }

    if (label.includes('hdmi')) {
      return 'hdmi';
    }

    if (label.includes('usb')) {
      return 'usb';
    }

    if (label.includes('built-in')) {
      return 'builtIn';
    }

    if (label.includes('airplay')) {
      return 'airplay';
    }
  }

  return undefined;
}

export function marshalLabel(deviceLabel: string, operatingSystem: string) {
  const osName = operatingSystem.toLowerCase();
  let nicerLabel = deviceLabel;

  if (osName.includes('mac')) {
    // Strip the output type
    nicerLabel = (deviceLabel.split('(')[0] ?? '').trim();
  }

  return nicerLabel;
}

export function isWindowsCommunicationsDevice(
  d: MediaDeviceInfo | NativePlayerComponentDeviceDescription,
): boolean {
  let name: string | undefined;

  if ('label' in d) {
    name = d.label;
  }

  if ('name' in d) {
    name = d.name;
  }

  return name !== undefined && name.startsWith('Communications');
}

export function getOutputDeviceByName(
  devices: Set<OutputDevice>,
  name: string,
) {
  name = marshalLabel(name, platform.os.name || '');

  if ([...devices].length === 0 || name === '') {
    return undefined;
  }

  const exactMatch = [...devices].filter(od => od.name === name)[0];

  if (exactMatch) {
    return exactMatch;
  }

  const matches = [...devices]
    .filter(device => name.includes(device.name) || device.name.includes(name))
    .map(device => ({
      device,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      distance: levenshtein(device.name, name),
    }))
    .sort((a, b) => a.distance - b.distance)
    .reverse();

  if (matches.length > 0) {
    const closestMatch = matches.pop();

    if (closestMatch && closestMatch.distance <= 16) {
      return closestMatch.device;
    }
  }

  return undefined;
}

export class OutputDevices {
  #activeDevice: OutputDevice;

  #defaultDevice: OutputDevice;

  #deviceMode: NativePlayerDeviceMode = 'shared';

  #events: EventTarget;

  #nativeDevices: Set<NativePlayerComponentDeviceDescription>;

  #passThrough: boolean | undefined = undefined;

  #webDevices: Set<MediaDeviceInfo>;

  outputDevices: Set<OutputDevice>;

  constructor() {
    this.#nativeDevices = new Set();
    this.#webDevices = new Set();
    this.#events = new EventTarget();

    this.#defaultDevice = new OutputDevice({
      name: 'System Default',
      nativeDeviceId: 'default',
      type: 'systemDefault',
      webDeviceId: 'default',
    });
    this.#activeDevice = this.#defaultDevice;

    this.outputDevices = new Set([this.#defaultDevice]);

    this.hydrateWebDevices().then().catch(console.error);

    navigator.mediaDevices.addEventListener('devicechange', () => {
      this.hydrateWebDevices().then().catch(console.error);
    });

    this.#events.addEventListener('native-devices', ((
      e: CustomEvent<Array<NativePlayerComponentDeviceDescription>>,
    ) => {
      this.#nativeDevices = new Set(e.detail);
      this.queueUpdate().then().catch(console.error);
    }) as EventListener);

    this.#events.addEventListener('web-devices', ((
      e: CustomEvent<Array<MediaDeviceInfo>>,
    ) => {
      this.#webDevices = new Set(e.detail);
      this.queueUpdate().then().catch(console.error);
    }) as EventListener);
  }

  addNativeDevices(devices: Array<NativePlayerComponentDeviceDescription>) {
    this.#events.dispatchEvent(
      new CustomEvent('native-devices', {
        detail: devices,
      }),
    );
  }

  addWebDevices(devices: Array<MediaDeviceInfo>) {
    // Filter out the default device.
    devices = devices.filter(d => d.deviceId !== 'default');

    this.#events.dispatchEvent(
      new CustomEvent('web-devices', {
        detail: devices,
      }),
    );
  }

  emitDeviceChange() {
    events.dispatchEvent(deviceChange([...this.outputDevices]));
  }

  getNativeDevice(
    id: string,
  ): NativePlayerComponentDeviceDescription | undefined {
    return [...this.#nativeDevices].find(nd => nd.id === id);
  }

  async hydrateWebDevices() {
    const mediaDevices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = mediaDevices.filter(d => d.kind === 'audiooutput');

    this.addWebDevices(audioOutputs);
  }

  mergeDevices() {
    // Remove previous native and web IDs for non-default devices
    // but keep the names and id.
    [...this.outputDevices]
      .filter(od => od.id !== 'default')
      .forEach(od => {
        od.nativeDeviceId = undefined;
        od.webDeviceId = undefined;
      });

    // Fill in native device ids and add possible new entries.
    this.#nativeDevices.forEach(nd => {
      const outputDevice = getOutputDeviceByName(this.outputDevices, nd.name);

      if (outputDevice) {
        outputDevice.nativeDeviceId = nd.id;
        outputDevice.controllableVolume = nd.controllableVolume;
        outputDevice.type = findOutputType(nd) || outputDevice.type;
      } else {
        this.outputDevices.add(
          new OutputDevice({
            controllableVolume: nd.controllableVolume,
            name: marshalLabel(nd.name, platform.os.name || ''),
            nativeDeviceId: nd.id,
            type: findOutputType(nd),
          }),
        );
      }
    });

    // Fill in web device ids and add possible new entries.
    this.#webDevices.forEach(wd => {
      const outputDevice = getOutputDeviceByName(this.outputDevices, wd.label);

      if (outputDevice) {
        outputDevice.webDeviceId = wd.deviceId;
        outputDevice.type = findOutputType(wd) || outputDevice.type;
      } else {
        this.outputDevices.add(
          new OutputDevice({
            name: marshalLabel(wd.label, platform.os.name || ''),
            type: findOutputType(wd),
            webDeviceId: wd.deviceId,
          }),
        );
      }
    });

    /*
      If there are output devices left without a webDeviceId or nativeDeviceId after
      the 2 previous loops then that device was most likely unplugged.
      Remove it.

      Also remove airplay devices and windowsCommunication devices.
     */
    [...this.outputDevices]
      .filter(
        od =>
          (od.webDeviceId === undefined && od.nativeDeviceId === undefined) ||
          od.type === 'airplay' ||
          od.type === 'windowsCommunication',
      )
      .forEach(od => this.outputDevices.delete(od));
  }

  async queueUpdate() {
    const nativeDeviceChange = new Promise<
      Array<NativePlayerComponentDeviceDescription>
    >(resolve =>
      this.#events.addEventListener(
        'native-devices',
        ((e: CustomEvent<Array<NativePlayerComponentDeviceDescription>>) =>
          resolve(e.detail)) as EventListener,
        { once: true },
      ),
    );
    const webDeviceChange = new Promise<Array<MediaDeviceInfo>>(resolve =>
      this.#events.addEventListener(
        'web-devices',
        ((e: CustomEvent<Array<MediaDeviceInfo>>) =>
          resolve(e.detail)) as EventListener,
        { once: true },
      ),
    );
    const timeout = (s: number) =>
      new Promise<void>(r => setTimeout(() => r(), s));

    await Promise.any([nativeDeviceChange, webDeviceChange, timeout(1000)]);

    this.mergeDevices();
    this.emitDeviceChange();
  }

  set activeDevice(device: OutputDevice) {
    this.#activeDevice = device;

    this.#passThrough = false;
    this.#deviceMode = 'shared';

    playerState.activePlayer?.updateOutputDevice()?.catch(console.error);
  }

  get activeDevice() {
    return this.#activeDevice;
  }

  /**
   * Set the current device mode for the output device.
   */
  set deviceMode(deviceMode: NativePlayerDeviceMode) {
    const { activeDevice } = this;
    const { activePlayer } = playerState;

    if (
      activeDevice &&
      activePlayer &&
      activePlayer.name === 'nativePlayer' &&
      this.deviceMode !== deviceMode
    ) {
      this.#deviceMode = deviceMode;
      (activePlayer as NativePlayer).updateDeviceMode();
    }
  }

  get deviceMode() {
    return this.#deviceMode;
  }

  /**
   * Set to true to disable software MQA decoder.
   */
  set passThrough(passThrough: boolean) {
    const { activeDevice } = this;
    const { activePlayer } = playerState;

    if (
      activeDevice &&
      activePlayer &&
      activePlayer.name === 'nativePlayer' &&
      this.passThrough !== passThrough
    ) {
      this.#passThrough = passThrough;
      (activePlayer as NativePlayer).updatePassThrough();
    }
  }

  get passThrough() {
    return Boolean(this.#passThrough);
  }
}

export const outputDevices = new OutputDevices();
