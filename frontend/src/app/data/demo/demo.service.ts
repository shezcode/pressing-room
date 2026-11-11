import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '@env';

// Whether the API runs as the public Demo. Read once at startup; anything but a clear "on" means off.
@Injectable({ providedIn: 'root' })
export class DemoService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly enabledState = signal(false);
  readonly enabled = this.enabledState.asReadonly();

  load(): void {
    this.http.get<{ enabled: boolean }>(`${environment.apiBaseUrl}/api/demo`).subscribe({
      next: ({ enabled }) => this.enabledState.set(enabled === true),
      error: () => this.enabledState.set(false)
    });
  }

  // The covers the shop already has, as Record coverUrl paths. The Demo picks from these instead of uploading.
  covers(): Observable<string[]> {
    return this.http.get<{ covers: string[] }>(`${environment.apiBaseUrl}/api/demo/covers`).pipe(map(({ covers }) => covers));
  }
}
