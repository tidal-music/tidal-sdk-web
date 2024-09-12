import { PlayerError } from './internal';

class PlayerEventTarget extends EventTarget {
  dispatchError(error: PlayerError): void {
    this.dispatchEvent(
      new CustomEvent('error', {
        detail: error.toJSON(),
      }),
    );
  }
}

export const events: PlayerEventTarget = new PlayerEventTarget();
