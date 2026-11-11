import { RecordFormat } from '@data/records/record.model';

export interface CollectionEntry {
  recordId: string;
  artist: string;
  title: string;
  format: RecordFormat;
  coverUrl: string;
  quantity: number;
  inShop: boolean;
}
