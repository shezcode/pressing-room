import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { Order, OrderLineRequest, ShippingAddressInput } from './order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http: HttpClient = inject(HttpClient);

  // Customer only. A 409 means the whole Order was rejected; its body lists each failing line
  place(lines: OrderLineRequest[], shippingAddress: ShippingAddressInput): Observable<Order> {
    return this.http.post<Order>(`${environment.apiBaseUrl}/api/orders`, { lines, shippingAddress });
  }

  // Customer only; someone else's Order answers 404
  get(id: string): Observable<Order> {
    return this.http.get<Order>(`${environment.apiBaseUrl}/api/orders/${encodeURIComponent(id)}`);
  }
}
