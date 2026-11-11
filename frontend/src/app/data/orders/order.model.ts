import { RecordFormat } from '@data/records/record.model';

// What checkout sends: the Cart's ids and quantities only, since the server prices the Order itself
export interface OrderLineRequest {
  recordId: string;
  quantity: number;
}

// Location ids come from the /location routes, like at signup
export interface ShippingAddressInput {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  isoCode: string;
  communityId: string;
  provinceId: string;
}

// The stored address also carries the names of the chosen locations
export interface ShippingAddress extends ShippingAddressInput {
  country: string;
  community: string;
  province: string;
}

// A snapshot of the Record at purchase; it never changes when the Record is edited or deleted
export interface OrderLine {
  recordId: string;
  artist: string;
  title: string;
  format: RecordFormat;
  // Integer USD cents at purchase
  price: number;
  coverUrl: string;
  quantity: number;
}

// Why a requested line could not be ordered: its Record was deleted, or fewer copies are left than requested
export type RejectedLineReason = 'missing' | 'insufficientStock';

export interface RejectedLine {
  recordId: string;
  quantity: number;
  reason: RejectedLineReason;
  // Copies in stock right now (0 for a deleted Record)
  available: number;
}

// The body of a 409: the whole Order was rejected, nothing was reduced, and every failing line is listed
export interface OrderRejection {
  code: 'ORDER_REJECTED';
  message: string;
  lines: RejectedLine[];
}

export type OrderStatus = 'Placed';

export interface Order {
  id: string;
  customerId: string;
  lines: OrderLine[];
  shippingAddress: ShippingAddress;
  // Integer USD cents
  total: number;
  status: OrderStatus;
  datePlaced: string;
}
