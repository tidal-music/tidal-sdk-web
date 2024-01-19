import {
  type ErrorOptions,
  TidalError,
  type TidalMessage,
} from '@tidal-music/common';

import * as bus from '../bus';

/**
 * This read-only property indicates whether or not there is an outage.
 * Each time this property toggles value, a corresponding OutageStartError or OutageEndMessage is sent on the bus.
 */
let _isOutage = false;

/**
 * Indicates that an outage has started.
 *
 * @errorCode
 * @extends TidalError
 */
export class OutageStartError extends TidalError {
  constructor(errorCode: string, options?: ErrorOptions) {
    super(errorCode, options);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, OutageStartError.prototype);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OutageStartError);
    }

    this.name = 'OutageStartError';
  }
}

/**
 * Indicates that an outage has ended.
 */
export const OutageEndMessage: TidalMessage = {
  name: 'OutageEndMessage',
} as const;

/**
 * Sets the outage state. If the state is changed, an OutageStartError or OutageEndMessage is sent on the bus.
 *
 * @param {boolean} outage
 */
export const setOutage = (outage: boolean) => {
  const hasChanged = _isOutage !== outage;
  if (hasChanged) {
    _isOutage = outage;
    if (outage) {
      bus.postMessage(new OutageStartError('1'));
    } else {
      bus.postMessage(OutageEndMessage);
    }
  }
};

export const isOutage = () => _isOutage;
