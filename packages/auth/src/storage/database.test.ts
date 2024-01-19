import { database } from './database';

describe('database', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    });
  });
  describe('getItem', () => {
    it('gets an item from storage and transforms it', () => {
      const storageSpy = vi
        .spyOn(localStorage, 'getItem')
        .mockReturnValue('test');
      const item = database.getItem('key');
      const arr = new Uint8Array(4);
      arr.set([116, 101, 115, 116]);

      expect(item).toEqual(arr);
      expect(storageSpy).toHaveBeenCalledWith('AuthDB/key');
    });

    it('returns undefined if nothing was found in storage', () => {
      const storageSpy = vi
        .spyOn(localStorage, 'getItem')
        .mockReturnValue(null);
      const item = database.getItem('key');

      expect(item).toEqual(undefined);
      expect(storageSpy).toHaveBeenCalledWith('AuthDB/key');
    });
  });

  describe('setItem', () => {
    it('sets an item to storage and transforms it before', () => {
      const arr = new Uint8Array(4);
      arr.set([116, 101, 115, 116]);
      const storageSpy = vi.spyOn(localStorage, 'setItem');
      database.setItem('key', arr);

      expect(storageSpy).toHaveBeenCalledWith('AuthDB/key', 'test');
    });
  });

  describe('removeItem', () => {
    it('removes an item from storage', () => {
      const storageSpy = vi.spyOn(localStorage, 'removeItem');
      database.removeItem('key');

      expect(storageSpy).toHaveBeenCalledWith('AuthDB/key');
    });
  });
});
