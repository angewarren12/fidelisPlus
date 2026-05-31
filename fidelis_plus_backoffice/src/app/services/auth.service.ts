import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { AuthResponse, MeResponse, User } from '../models/auth.model';
import { UserRole } from '../models/user-roles';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_TOKEN_KEY = 'fidelis_auth_token';
  private readonly USER_KEY = 'fidelis_user_data';
  private readonly API_URL = `${environment.apiUrl}/api/v1`;

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(...roles: UserRole[]): boolean {
    const role = this.getCurrentUser()?.role;
    return !!role && roles.includes(role);
  }

  constructor(private http: HttpClient) {}

  login(login: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, { login, password }).pipe(
      tap(response => {
        if (response.status === 'success') {
          this.setSession(response.data.token, response.data.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.AUTH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  /** Synchronise le rôle et le profil depuis GET /auth/me. */
  refreshCurrentUser(): Observable<User> {
    return this.http.get<MeResponse>(`${this.API_URL}/auth/me`).pipe(
      map((res) => res.data),
      tap((user) => {
        const token = this.getToken();
        if (token) {
          this.setSession(token, user);
        }
      })
    );
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.AUTH_TOKEN_KEY);
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }
}
