import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { Community, Country, Province } from './location.model';

@Injectable({ providedIn: 'root' })
export class LocationsService {
  private readonly http: HttpClient = inject(HttpClient);

  countries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${environment.apiBaseUrl}/location/countries`);
  }

  communities(): Observable<Community[]> {
    return this.http.get<Community[]>(`${environment.apiBaseUrl}/location/communities`);
  }

  provinces(communityId: string): Observable<Province[]> {
    return this.http.get<Province[]>(`${environment.apiBaseUrl}/location/provinces/${encodeURIComponent(communityId)}`);
  }
}
