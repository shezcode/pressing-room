import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { Subscriber } from './subscriber.model';

@Injectable({ providedIn: 'root' })
export class SubscribersService {
  private readonly http: HttpClient = inject(HttpClient);

  subscribe(email: string): Observable<Subscriber> {
    return this.http.post<Subscriber>(`${environment.apiBaseUrl}/api/subscribers`, { email });
  }

  // The backend answers a duplicate with 409 and this code, so it can be told apart from other failures
  isAlreadySubscribed(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 409 && error.error?.code === 'ALREADY_SUBSCRIBED';
  }
}
