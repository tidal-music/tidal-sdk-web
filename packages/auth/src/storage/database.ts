const prefix = 'AuthDB';

// source: https://discourse.mozilla.org/t/efficient-storage-of-arraybuffer-uint8array/59698/3
function bufferToString(buf: ArrayBuffer | Uint8Array) {
  return String.fromCharCode(...new Uint8Array(buf));
}

function stringToUint8Array(str: string) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

export const database = {
  getItem: <T>(key: string) => {
    const result = globalThis.localStorage.getItem(`${prefix}/${key}`);
    return result ? (stringToUint8Array(result) as T) : undefined;
  },
  removeItem: (key: string) => {
    globalThis.localStorage.removeItem(`${prefix}/${key}`);
  },
  setItem: (key: string, data: ArrayBuffer | Uint8Array) => {
    globalThis.localStorage.setItem(`${prefix}/${key}`, bufferToString(data));
  },
};
