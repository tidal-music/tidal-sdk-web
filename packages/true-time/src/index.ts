export class TrueTime {
  #clientStartTime?: number;

  #isSynchronizing = false;

  #serverTime?: number;

  #url: URL;

  constructor(url: string) {
    this.#url = new URL(url);
    void this.synchronize();
  }

  /**
   * Returns the current time adjusted to server-time.
   *
   * @param clientCurrentTime The current time on the client side. Defaults to Date.now().
   * @returns The current adjusted time (or the client time if not synced yet).
   */
  // eslint-disable-next-line no-restricted-syntax
  now(clientCurrentTime = Date.now()): number {
    if (!this.#serverTime || !this.#clientStartTime) {
      console.warn('TrueTime is not yet synchronized');
      return clientCurrentTime;
    }

    return this.#serverTime + (clientCurrentTime - this.#clientStartTime);
  }

  /**
   * Synchronizes the client's time with the server's time.
   * If the client's time is already synchronized within an hour, this method does nothing.
   *
   * @returns {Promise<void>} A promise that resolves when the synchronization is complete.
   */
  async synchronize(): Promise<void> {
    const anHour = 3_600_000;

    if (
      (this.#clientStartTime &&
        // eslint-disable-next-line no-restricted-syntax
        Math.abs(Date.now() - this.#clientStartTime) < anHour) ||
      this.#isSynchronizing
    ) {
      return;
    }

    this.#isSynchronizing = true;
    try {
      const response = await fetch(this.#url);

      if (response.ok && response.headers.has('date')) {
        this.#serverTime = new Date(response.headers.get('date')!).getTime();
        // eslint-disable-next-line no-restricted-syntax
        this.#clientStartTime = Date.now();
      }
    } catch (error) {
      console.error(error);
    }
    this.#isSynchronizing = false;
  }

  /**
   * Returns the timestamp of a performance mark with the specified name and detail.
   * PS: `performance.mark` must be called with `startTime: trueTime.now()`.
   *
   * @param markName - The name of the performance mark.
   * @param detail - Optional. The detail of the performance mark.
   * @returns The timestamp of the performance mark, or undefined if not found.
   * @throws ReferenceError if the performance mark is not found.
   */
  timestamp(markName: string, detail?: string): number | undefined {
    let performanceEntry: PerformanceEntry | undefined;

    if (detail) {
      performanceEntry = performance
        .getEntriesByName(markName)
        .find(entry => 'detail' in entry && entry.detail === detail);

      if (!performanceEntry) {
        throw new ReferenceError(
          `There is no performance entry named "${markName}" with detail "${detail}"`,
        );
      }
    } else {
      performanceEntry = performance.getEntriesByName(markName).pop();
    }

    return performanceEntry ? performanceEntry.startTime : undefined;
  }
}

export const trueTime = new TrueTime('https://api.tidal.com/v1/ping');
