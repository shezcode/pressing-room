import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@env';
import { AuthResponse, Credentials, Role, Session, SignUpData } from '@core/types/auth';

const SESSION_STORAGE_KEY = 'pressing-room.session';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  public readonly LOGIN_PATH = '/auth/signin';
  public readonly SIGNUP_PATH = '/auth/signup';
  public readonly DEMO_LOGIN_PATH = '/api/demo/signin';
  public readonly REFRESH_TOKEN_PATH = '/api/users/refreshToken';
  private readonly http: HttpClient = inject(HttpClient);

  private readonly session = signal<Session | null>(this.restoreSession());

  public readonly user = computed(() => this.session()?.user ?? null);
  public readonly isLoggedIn = computed(() => this.session() !== null);
  public readonly isAdmin = computed(() => this.user()?.role === 'admin');
  public readonly isCustomer = computed(() => this.user()?.role === 'customer');

  public getToken(): string {
    return this.session()?.token ?? '';
  }

  public signIn(credentials: Credentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}${this.LOGIN_PATH}`, credentials)
      .pipe(tap((response) => this.startSession(response)));
  }

  // The backend signs the new Customer in as part of sign-up, so the response is a session like sign-in's
  public signUp(data: SignUpData): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}${this.SIGNUP_PATH}`, data)
      .pipe(tap((response) => this.startSession(response)));
  }

  // Demo only: the backend signs in its seeded account for the role, so no password is sent
  public demoSignIn(role: Role): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}${this.DEMO_LOGIN_PATH}`, { role })
      .pipe(tap((response) => this.startSession(response)));
  }

  // Log the current user out by removing credentials
  logout(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.session.set(null);
  }

  private startSession({ token, user }: AuthResponse): void {
    const session: Session = { token, user };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  // An expired token is not checked here: the first request the API rejects (401) logs the user out
  private restoreSession(): Session | null {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null') as Session | null;
      return session?.token && session.user ? session : null;
    } catch {
      // An unreadable entry would otherwise break every page load
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }
}
