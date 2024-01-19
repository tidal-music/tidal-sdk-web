import { PlayerError } from './internal';

class PlayerEventTarget extends EventTarget {
  dispatchError(error: PlayerError) {
    this.dispatchEvent(
      new CustomEvent('error', {
        detail: error.toJSON(),
      }),
    );
  }
}

export const events = new PlayerEventTarget();
