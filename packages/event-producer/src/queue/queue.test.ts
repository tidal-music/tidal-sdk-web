import '@vitest/web-worker';

import { epEvent1, epEvent2 } from '../../test/fixtures/events';
import { init as initUuid } from '../uuid/uuid';

import { db as _db } from './db';
import * as queue from './queue';

const db = vi.mocked(_db);

vi.mock('./db', () => ({
  db: {
    getItem: vi.fn().mockResolvedValue(undefined),
    ready: vi.fn().mockResolvedValue(true),
    removeItem: vi.fn().mockResolvedValue(true),
    setItem: vi.fn().mockResolvedValue(true),
  },
}));

describe.sequential('Queue', () => {
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

  it('init: filters out designated event types', async () => {
    db.getItem.mockResolvedValueOnce([epEvent1, epEvent2]);
    await queue.initDB({ feralEventTypes: [epEvent2.name] });

    expect(queue.getEvents()).toEqual([epEvent1]);
  });
});
