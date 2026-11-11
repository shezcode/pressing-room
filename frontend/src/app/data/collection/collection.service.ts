import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { CollectionEntry } from './collection.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private readonly http: HttpClient = inject(HttpClient);

  // Customer only; the most recently bought Records come first
  list(): Observable<CollectionEntry[]> {
    return this.http.get<CollectionEntry[]>(`${environment.apiBaseUrl}/api/collection`);
  }
}
