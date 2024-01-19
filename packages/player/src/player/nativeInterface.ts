export type NativeMediaItem = {
  album: null | string | undefined;
  artist: string;
  duration: number;
  id: number | string;
  imageUrl: null | string | undefined;
  title: string;
  type: 'track' | 'video';
  url: null | string | undefined;
};

export type NativePlaybackInterfaceDelegate = {
  pause(): void;
  playNext(): void;
  playPrevious(): void;
  resume(): void;
  seekTo(time: number): void;
  setRepeatEnum(repeatMode: number): void;
  setShuffle(bool: boolean): void;
  toggleMute(): void;
  volumeDown(): void;
  volumeUp(): void;
};

export type NativePlayerComponent = {
  Player: () => NativePlayerComponentInterface;
};

export type NativePlayerComponentSupportedEvents =
  | 'devicedisconnected'
  | 'deviceexclusivemodenotallowed'
  | 'deviceformatnotsupported'
  | 'devicelocked'
  | 'devicenotfound'
  | 'devices'
  | 'deviceunknownerror'
  | 'devicevolume'
  | 'devicevolumenotsupported'
  | 'mediacurrenttime'
  | 'mediaduration'
  | 'mediaerror'
  | 'mediaformat'
  | 'mediamaxconnectionsreached'
  | 'mediamqadecoderstate'
  | 'mediastate'
  | 'version';

export type NativePlayerDeviceMode = 'exclusive' | 'shared';

export type NativePlayerDeviceType = 'airplay' | 'default' | 'mqa';

export type NativePlayerComponentDeviceDescription = {
  controllableVolume: boolean;
  id: string;
  name: string;
  type: NativePlayerDeviceType;
};

export type NativePlayerStreamFormat =
  | 'aac'
  | 'aac+'
  | 'flac'
  | 'mp3'
  | 'mp4a.40.2'
  | 'mp4a.40.5'
  | 'mqa'
  | 'none';

export type NativePlayerComponentInterface = {
  addEventListener(
    eventName: NativePlayerComponentSupportedEvents,
    listener: (...args: Array<any>) => void,
  ): void;
  cancelPreload(): void;
  disableMQADecoder(): void;
  enableMQADecoder(): void;
  listDevices(): void;
  load(
    url: string,
    streamFormat: NativePlayerStreamFormat,
    encryptionKey?: string,
  ): void;
  on(
    event: NativePlayerComponentSupportedEvents,
    fn: (...args: Array<any>) => void,
  ): void;
  pause(): void;
  play(): void;
  preload(
    url: string,
    streamFormat: NativePlayerStreamFormat,
    encryptionKey?: string,
  ): void;
  recover(url: string, encryptionKey?: string): void;
  releaseDevice(): void;
  seek(miliseconds: number): void;
  selectDevice(
    device: Partial<NativePlayerComponentDeviceDescription>,
    mode: NativePlayerDeviceMode,
  ): void;
  selectSystemDevice(): void;
  setVolume(volume: number): void;
  stop(): void;
};
