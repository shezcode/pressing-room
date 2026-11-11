import { TestBed } from '@angular/core/testing';
import { ShopRecord } from '@data/records/record.model';
import { CartService } from './cart.service';

const STORAGE_KEY = 'pressing-room.cart';

function record(id: string, stock: number): ShopRecord {
  return {
    id,
    artist: 'Artist',
    title: `Title ${id}`,
    format: 'Vinyl',
    variant: null,
    year: 2000,
    genre: 'Rock',
    price: 1000,
    stock,
    coverUrl: '',
    featured: false,
    description: '',
    dateAdded: '2026-01-01T00:00:00.000Z'
  };
}

// A fresh service reads the Cart the way a page reload does
function reload(): CartService {
  TestBed.resetTestingModule();
  return TestBed.inject(CartService);
}

describe('CartService', () => {
  let cart: CartService;

  beforeEach(() => {
    cart = TestBed.inject(CartService);
  });

  it('starts empty', () => {
    expect(cart.lines()).toEqual([]);
    expect(cart.count()).toBe(0);
  });

  describe('quantity cap at stock', () => {
    it('adds one copy at a time and counts every copy', () => {
      cart.add(record('a', 5));
      cart.add(record('a', 5));
      cart.add(record('b', 5));

      expect(cart.lines()).toEqual([
        { recordId: 'a', quantity: 2 },
        { recordId: 'b', quantity: 1 }
      ]);
      expect(cart.count()).toBe(3);
    });

    it('stops adding once every copy in stock is in the Cart', () => {
      const a = record('a', 2);
      cart.add(a);
      cart.add(a);
      cart.add(a);

      expect(cart.quantityOf('a')).toBe(2);
    });

    it('does not add an Out of stock Record', () => {
      cart.add(record('a', 0));

      expect(cart.lines()).toEqual([]);
    });

    it('caps a set quantity at stock and rounds it down', () => {
      const a = record('a', 4);
      cart.setQuantity(a, 10);
      expect(cart.quantityOf('a')).toBe(4);

      cart.setQuantity(a, 2.7);
      expect(cart.quantityOf('a')).toBe(2);
    });

    it('ignores a quantity below one', () => {
      const a = record('a', 4);
      cart.setQuantity(a, 3);
      cart.setQuantity(a, 0);

      expect(cart.quantityOf('a')).toBe(3);
    });

    it('capToStock lowers lines to current stock but keeps Out of stock lines', () => {
      cart.setQuantity(record('a', 5), 5);
      cart.setQuantity(record('b', 5), 2);
      cart.setQuantity(record('c', 5), 3);

      cart.capToStock([record('a', 3), record('b', 9), record('c', 0)]);

      expect(cart.lines()).toEqual([
        { recordId: 'a', quantity: 3 },
        { recordId: 'b', quantity: 2 },
        { recordId: 'c', quantity: 3 }
      ]);
    });

    it('capToAvailable lowers one line to what the server says is left', () => {
      cart.setQuantity(record('a', 5), 4);

      cart.capToAvailable('a', 1);
      expect(cart.quantityOf('a')).toBe(1);

      cart.capToAvailable('a', 0);
      expect(cart.quantityOf('a')).toBe(1);
    });
  });

  it('remove drops one line and clear empties the Cart', () => {
    cart.add(record('a', 1));
    cart.add(record('b', 1));

    cart.remove('a');
    expect(cart.lines()).toEqual([{ recordId: 'b', quantity: 1 }]);

    cart.clear();
    expect(cart.lines()).toEqual([]);
  });

  describe('browser persistence', () => {
    it('keeps the Cart across a reload', () => {
      cart.setQuantity(record('a', 5), 3);
      cart.add(record('b', 5));

      expect(reload().lines()).toEqual([
        { recordId: 'a', quantity: 3 },
        { recordId: 'b', quantity: 1 }
      ]);
    });

    it('keeps removals and clearing across a reload', () => {
      cart.add(record('a', 5));
      cart.add(record('b', 5));
      cart.remove('a');
      expect(reload().lines()).toEqual([{ recordId: 'b', quantity: 1 }]);

      reload().clear();
      expect(reload().lines()).toEqual([]);
    });

    it('drops stored lines that are not well formed', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          { recordId: 'ok', quantity: 2 },
          { recordId: 7, quantity: 1 },
          { recordId: 'zero', quantity: 0 },
          { recordId: 'half', quantity: 1.5 },
          null
        ])
      );

      expect(reload().lines()).toEqual([{ recordId: 'ok', quantity: 2 }]);
    });

    it('starts empty when storage holds something unreadable', () => {
      localStorage.setItem(STORAGE_KEY, '{not json');
      expect(reload().lines()).toEqual([]);

      localStorage.setItem(STORAGE_KEY, '{"recordId":"a"}');
      expect(reload().lines()).toEqual([]);
    });
  });
});
