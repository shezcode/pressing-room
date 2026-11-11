export const RECORD_FORMATS = ['Vinyl', 'CD', 'Cassette'] as const;
export type RecordFormat = (typeof RECORD_FORMATS)[number];

// A Record in the glossary's sense; named ShopRecord to avoid shadowing TypeScript's built-in Record<K, V>
export interface ShopRecord {
  id: string;
  artist: string;
  title: string;
  format: RecordFormat;
  variant: string | null;
  year: number;
  genre: string;
  // Integer USD cents
  price: number;
  stock: number;
  coverUrl: string;
  featured: boolean;
  description: string;
  dateAdded: string;
}

// The variant (LP, 2xLP) is the more precise label when a Record has one
export function formatLabel(record: ShopRecord): string {
  return record.variant ?? record.format;
}

export interface RecordPage {
  records: ShopRecord[];
  total: number;
  page: number;
  limit: number;
}
