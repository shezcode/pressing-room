import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { RecordFormat, RecordPage, ShopRecord } from './record.model';

@Injectable({ providedIn: 'root' })
export class RecordsService {
  private readonly http: HttpClient = inject(HttpClient);

  list(options: {
    page: number;
    limit: number;
    search?: string;
    format?: RecordFormat;
    featured?: boolean;
  }): Observable<RecordPage> {
    let params = new HttpParams().set('page', options.page).set('limit', options.limit);
    if (options.search) {
      params = params.set('search', options.search);
    }
    if (options.format) {
      params = params.set('format', options.format);
    }
    if (options.featured) {
      params = params.set('featured', true);
    }
    return this.http.get<RecordPage>(`${environment.apiBaseUrl}/api/records`, { params });
  }

  get(id: string): Observable<ShopRecord> {
    return this.http.get<ShopRecord>(`${environment.apiBaseUrl}/api/records/${encodeURIComponent(id)}`);
  }

  // Admin only: a multipart body with the Record's fields and its `cover` image file
  create(body: FormData): Observable<ShopRecord> {
    return this.http.post<ShopRecord>(`${environment.apiBaseUrl}/api/records`, body);
  }

  // Admin only: the same multipart body as `create`, with the `cover` file left out to keep the current one
  update(id: string, body: FormData): Observable<ShopRecord> {
    return this.http.put<ShopRecord>(`${environment.apiBaseUrl}/api/records/${encodeURIComponent(id)}`, body);
  }

  // Admin only
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/api/records/${encodeURIComponent(id)}`);
  }

  // Cover paths are served by the backend, so they are relative to the API address
  coverSrc(coverUrl: string): string {
    return `${environment.apiBaseUrl}${coverUrl}`;
  }
}
