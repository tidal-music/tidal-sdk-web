import '@vitest/web-worker';

import { epEvent1 } from '../../test/fixtures/events';
import { init as initUuid } from '../uuid/uuid';

import { db as _db } from './db';
import * as queue from './queue';

const db = vi.mocked(_db);

vi.mock('./db', () => ({
  db: {
    getItem: vi.fn(),
    ready: vi.fn().mockResolvedValue(true),
    removeItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('Queue', () => {
  beforeAll(async () => {
    await initUuid();
  });

  beforeEach(() => {
    // reset queue events between tests
    queue.setEvents([]);
  });

  it('initDB: restores saved queue', async () => {
    db.getItem.mockResolvedValueOnce([epEvent1]);

    await queue.initDB();

    expect(queue.getEvents()).toEqual([epEvent1]);
  });

  it('addEvent: adds event to array and persist in indexedDB', async () => {
    await queue.initDB();
    await queue.addEvent(epEvent1);

    expect(queue.getEvents()).toEqual([epEvent1]);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(db.setItem).toHaveBeenCalledWith('events', [epEvent1]);
  });
});
