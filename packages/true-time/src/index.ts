export class TrueTime {
  #clientStartTime: number;

  #serverTime?: number;

  #synced: number | undefined;

  #url: URL;

  constructor(url: string) {
    this.#url = new URL(url);
    this.#clientStartTime = performance.now();
  }
  now(highResTimeStamp: DOMHighResTimeStamp = performance.now()): number {
    if (!this.#serverTime || !this.#clientStartTime) {
      throw new ReferenceError(
        'Initialization has not been done yet. You need to call and await the synchronize method once.',
      );
    }

    return Number.parseInt(
      (
        this.#serverTime + Math.abs(this.#clientStartTime - highResTimeStamp)
      ).toFixed(0),
      10,
    );
  }

  /**
   * Use this method to synchronize time with the server.
   *
   * @param url - server url
   */
  async synchronize() {
    // Synchronize at max once every 1 000 000 miliseconds
    // eslint-disable-next-line no-restricted-syntax
    if (this.#synced && Math.abs(this.#synced - Date.now()) < 1_000_000) {
      return;
    }

    try {
      const response = await fetch(this.#url);

      if (response.ok && response.headers.has('date')) {
        this.#serverTime = new Date(response.headers.get('date')!).getTime();
        // eslint-disable-next-line no-restricted-syntax
        this.#synced = Date.now();
      }
    } catch (error) {
      console.error(error);
    }
  }

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

    return performanceEntry ? this.now(performanceEntry.startTime) : undefined;
  }
}

export const trueTime = new TrueTime('https://api.tidal.com/v1/ping');
