import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  avatar_url?: string | null;
  clients_count?: number;
  prospects_count?: number;
  scans_count?: number;
  redemptions_handled_count?: number;
  is_main_contact: boolean;
  created_at?: string;
  detail?: {
    cashier?: {
      points_credited: number;
      last_scan_at: string | null;
      top_station: { station_name: string; scans_count: number } | null;
    };
    marketing?: {
      redemptions_delivered: number;
      redemptions_cancelled: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/team`;

  getPaged(params: { page?: number; per_page?: number; role?: string; search?: string } = {}): Observable<{ data: User[]; meta: PaginatedMeta }> {
    let hp = new HttpParams();
    hp = hp.set('page', String(params.page ?? 1));
    hp = hp.set('per_page', String(params.per_page ?? 12));
    if (params.role) hp = hp.set('role', params.role);
    if (params.search) hp = hp.set('search', params.search);
    return this.http.get<{ status: string; data: User[]; meta: PaginatedMeta }>(this.apiUrl, { params: hp }).pipe(
      map(res => ({
        data: res.data ?? [],
        meta: res.meta ?? {
          current_page: 1,
          last_page: 1,
          per_page: params.per_page ?? 12,
          total: res.data?.length ?? 0,
        },
      }))
    );
  }

  getAll(role?: string): Observable<User[]> {
    return this.getPaged({ role, page: 1, per_page: 500 }).pipe(map(r => r.data));
  }

  getById(id: number): Observable<User> {
    return this.http.get<{data: User}>(`${this.apiUrl}/${id}`).pipe(map(res => res.data));
  }

  create(user: Partial<User>): Observable<{ user: User; temporary_password: string }> {
    return this.http.post<{ data: User; temporary_password: string }>(this.apiUrl, user).pipe(
      map(res => ({ user: res.data, temporary_password: res.temporary_password }))
    );
  }

  update(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<{data: User}>(`${this.apiUrl}/${id}`, user).pipe(map(res => res.data));
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  reassignClients(oldCommercialId: number, newCommercialId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${oldCommercialId}/reassign`, {
      new_commercial_id: newCommercialId
    });
  }
}
