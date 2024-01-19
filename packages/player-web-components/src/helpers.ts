export const css = String.raw;
export const html = String.raw;

/**
 * Takes 't' seconds and formats them as '(hh:)mm:ss'.
 * Only 0-pad minutes if needed (hours present).
 */
export function asTime(t?: number | string) {
  if (t === undefined) {
    return '0:00';
  }

  const numSecs = parseInt(String(t), 10);
  const hours = Math.floor(numSecs / 3600);
  const minutes = Math.floor((numSecs - hours * 3600) / 60);
  const seconds = numSecs - hours * 3600 - minutes * 60;

  let time = '';

  if (hours !== 0) {
    const mins = minutes < 10 ? `0${minutes}` : String(minutes);
    time = `${hours}:${mins}:`;
  } else {
    time = `${minutes}:`;
  }

  time += seconds < 10 ? `0${seconds}` : String(seconds);

  return time;
}

/**
 * Formats seconds to datetime durations for the <time> element.
 *
 * @see https://www.w3.org/TR/html5/infrastructure.html#duration-time-component
 * @param {number} t - Seconds
 */
export function timeDateTime(t: number | string = 0) {
  const sec = typeof t === 'number' ? t : parseInt(t, 10);
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor(sec / 60) % 60;
  const s = sec % 60;

  const partNumberstring = (value: number, index: number) => {
    // Do nothing if hour or seconds is 0. (Minute must always be present)
    if (value === 0 && index !== 1) {
      return '';
    }

    let partType;

    switch (index) {
      case 0:
        partType = 'H';
        break;
      case 1:
        partType = 'M';
        break;
      default:
        partType = 'S';
        break;
    }

    return `${partType}${value}`;
  };

  const time = [h, m, s].map(partNumberstring).join('');

  return `P${time}`;
}
