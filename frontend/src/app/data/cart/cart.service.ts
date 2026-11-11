import { Injectable, computed, signal } from '@angular/core';
import { ShopRecord } from '@data/records/record.model';

const STORAGE_KEY = 'pressing-room.cart';

// Only the id and quantity are kept: prices and stock are read from the API whenever the Cart is shown
export interface CartLine {
  recordId: string;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _lines = signal<CartLine[]>(this.read());

  readonly lines = this._lines.asReadonly();
  // Total quantity across all lines, shown in the header badge
  readonly count = computed(() => this._lines().reduce((total, line) => total + line.quantity, 0));

  quantityOf(recordId: string): number {
    return this._lines().find((line) => line.recordId === recordId)?.quantity ?? 0;
  }

  // Adds one copy, unless the Cart already holds every copy in stock
  add(record: ShopRecord): void {
    this.setQuantity(record, this.quantityOf(record.id) + 1);
  }

  // The quantity is capped at the Record's current stock; an Out of stock Record cannot be added
  setQuantity(record: ShopRecord, quantity: number): void {
    const capped = Math.min(Math.floor(quantity), record.stock);
    if (capped < 1) {
      return;
    }

    const exists = this._lines().some((line) => line.recordId === record.id);
    this.update(
      exists
        ? this._lines().map((line) => (line.recordId === record.id ? { ...line, quantity: capped } : line))
        : [...this._lines(), { recordId: record.id, quantity: capped }]
    );
  }

  // Stock may have dropped since the copies were added. Out of stock lines are left for the visitor to remove
  capToStock(records: ShopRecord[]): void {
    for (const record of records) {
      this.capToAvailable(record.id, record.stock);
    }
  }

  // After a rejected Order the server says how many copies are left. Like capToStock, a line with none left is
  // kept for the Customer to remove
  capToAvailable(recordId: string, available: number): void {
    if (available > 0 && this.quantityOf(recordId) > available) {
      this.update(this._lines().map((line) => (line.recordId === recordId ? { ...line, quantity: available } : line)));
    }
  }

  remove(recordId: string): void {
    this.update(this._lines().filter((line) => line.recordId !== recordId));
  }

  // After a successful Order
  clear(): void {
    this.update([]);
  }

  private update(lines: CartLine[]): void {
    this._lines.set(lines);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage unavailable (private mode): the Cart just won't survive a reload
    }
  }

  // Anything in storage that is not a well-formed line is dropped rather than trusted
  private read(): CartLine[] {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (!Array.isArray(stored)) {
        return [];
      }
      return stored.filter(
        (line): line is CartLine => typeof line?.recordId === 'string' && Number.isInteger(line.quantity) && line.quantity > 0
      );
    } catch {
      return [];
    }
  }
}
