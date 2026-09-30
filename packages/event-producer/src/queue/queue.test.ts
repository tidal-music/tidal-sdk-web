import '@vitest/web-worker';

import { epEvent1, epEvent2 } from '../../test/fixtures/events.js';
import { init as initUuid } from '../uuid/uuid.js';

import { db as _db } from './db.js';
import * as queue from './queue.js';

const db = vi.mocked(_db);

vi.mock('./db', () => ({
  db: {
    getItem: vi.fn().mockResolvedValue(undefined),
    ready: vi.fn().mockResolvedValue(true),
    removeItem: vi.fn().mockResolvedValue(true),
    setItem: vi.fn().mockResolvedValue(true),
  },
}));

describe('Queue', { concurrent: false }, () => {
  beforeAll(async () => {
    await initUuid();
  });

  beforeEach(() => {
    // reset queue events between tests
    queue.setEvents([]);
    // reset worker between tests
    queue.worker.terminate();
  });

  it('initDB: restores saved queue', async () => {
    db.getItem.mockResolvedValueOnce([epEvent1]);

    await queue.initDB();

    expect(queue.getEvents()).toEqual([epEvent1]);
  });

  it('addEvent: adds event to array and persist in db through worker', async () => {
    db.getItem.mockResolvedValueOnce(undefined);
    db.setItem.mockResolvedValueOnce(true);

    const postMessageSpy = vi.spyOn(queue.worker, 'postMessage');
    await queue.initDB();
    queue.addEvent(epEvent1);

    expect(queue.getEvents()).toEqual([epEvent1]);
    expect(postMessageSpy).toHaveBeenCalledWith({
      action: 'persist',
      events: [epEvent1],
    });
    await vi.waitFor(() => {
      expect(db.setItem).toHaveBeenCalledWith('events', [epEvent1]);
    });
  });

  it('initDB: rejects when the worker fails to initialize', async () => {
    vi.stubGlobal('console', { error: vi.fn() });
    db.getItem.mockRejectedValueOnce(new Error('idb unavailable'));

    await expect(queue.initDB()).rejects.toThrow(
      'Failed to initialize queue db',
    );
    expect(queue.getEvents()).toEqual([]);
  });

  it('initDB: overlapping calls share one worker request and restore once', async () => {
    db.getItem.mockResolvedValueOnce([epEvent1]);
    const postMessageSpy = vi.spyOn(queue.worker, 'postMessage');

    const first = queue.initDB();
    const second = queue.initDB();

    expect(second).toBe(first);
    await Promise.all([first, second]);

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(queue.getEvents()).toEqual([epEvent1]);
  });

  it('initDB: does not leak a worker message listener per call', async () => {
    db.getItem.mockResolvedValue(undefined);
    const addSpy = vi.spyOn(queue.worker, 'addEventListener');
    const removeSpy = vi.spyOn(queue.worker, 'removeEventListener');

    await queue.initDB();
    await queue.initDB();

    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(removeSpy).toHaveBeenCalledTimes(2);
    // a later worker message must not reach the listeners from earlier calls
    const eventsBefore = queue.getEvents();
    queue.worker.dispatchEvent(
      new MessageEvent('message', {
        data: { action: 'initSuccess', events: [epEvent1] },
      }),
    );
    expect(queue.getEvents()).toEqual(eventsBefore);
  });

  it('initDB: ignores replies meant for other requests', async () => {
    db.getItem.mockResolvedValue(undefined);
    const removeSpy = vi.spyOn(queue.worker, 'removeEventListener');

    const initializing = queue.initDB();
    // a clear reply arriving while init is pending must not settle init
    queue.worker.dispatchEvent(
      new MessageEvent('message', { data: { action: 'clearSuccess' } }),
    );
    expect(removeSpy).not.toHaveBeenCalled();

    await expect(initializing).resolves.toBeUndefined();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it('clearEvents: empties memory immediately and the db once the worker confirms', async () => {
    db.getItem.mockResolvedValueOnce([epEvent1, epEvent2]);
    await queue.initDB();
    expect(queue.getEvents()).toEqual([epEvent1, epEvent2]);

    const clearing = queue.clearEvents();
    expect(queue.getEvents()).toEqual([]);

    await expect(clearing).resolves.toBe(2);
    expect(db.removeItem).toHaveBeenCalledWith('events');
  });

  it('clearEvents: rejects when the db could not be cleared, memory is still emptied', async () => {
    vi.stubGlobal('console', { error: vi.fn() });
    db.getItem.mockResolvedValueOnce([epEvent1]);
    db.removeItem.mockRejectedValueOnce(new Error('idb unavailable'));
    await queue.initDB();

    await expect(queue.clearEvents()).rejects.toThrow(
      'Failed to clear queue db',
    );
    expect(queue.getEvents()).toEqual([]);
  });

  it('clearEvents: overlapping calls share one worker request', async () => {
    db.getItem.mockResolvedValueOnce([epEvent1]);
    await queue.initDB();
    const postMessageSpy = vi.spyOn(queue.worker, 'postMessage');

    const first = queue.clearEvents();
    const second = queue.clearEvents();

    expect(second).toBe(first);
    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledWith({ action: 'clear' });
  });

  it('clearEvents: a persist issued before the clear cannot resurrect events', async () => {
    db.getItem.mockResolvedValueOnce(undefined);
    await queue.initDB();
    queue.addEvent(epEvent1); // posts 'persist' [epEvent1]

    await queue.clearEvents(); // posts 'clear'

    const [setItemOrder] = db.setItem.mock.invocationCallOrder;
    const [removeItemOrder] = db.removeItem.mock.invocationCallOrder;
    expect(setItemOrder).toBeDefined();
    expect(removeItemOrder).toBeDefined();
    expect(setItemOrder ?? 0).toBeLessThan(removeItemOrder ?? 0);
  });

  it('init: filters out designated event types', async () => {
    db.getItem.mockResolvedValueOnce([epEvent1, epEvent2]);
    await queue.initDB({ feralEventTypes: [epEvent2.name] });

    expect(queue.getEvents()).toEqual([epEvent1]);
  });
});
