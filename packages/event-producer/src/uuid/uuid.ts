let isInitialized = typeof globalThis?.crypto?.randomUUID === 'function';

const defaultFn: () => string = () => globalThis.crypto?.randomUUID();

let fn: () => string = isInitialized
  ? defaultFn
  : () => {
      if (!isInitialized) {
        throw new Error(
          'Uuid not initialized; run await init(); before using uuid.',
        );
      }

      return 'UUID_NOT_INITIALIZED';
    };

export async function init() {
  if (!isInitialized) {
    const { nanoid } = await import('nanoid');
    fn = () => nanoid();
  }

  isInitialized = true;
}

export const uuid = () => fn();
