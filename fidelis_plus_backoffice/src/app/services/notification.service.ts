import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';
import { RealtimeService } from './realtime.service';

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  action: string | null;
  priority: 'normal' | 'high' | 'low';
  channel: 'push' | 'in_app' | 'both';
  data: any | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);
  private readonly base = `${environment.apiUrl}/api/v1/notifications`;

  getNotifications(page = 1, perPage = 20): Observable<{ items: NotificationItem[]; total: number }> {
    return this.http.get<any>(`${this.base}?page=${page}&per_page=${perPage}`).pipe(
      map((res) => ({
        items: res.data ?? [],
        total: res.meta?.total ?? 0,
      }))
    );
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<any>(`${this.base}/unread-count`).pipe(
      map((res) => res.data?.unread ?? 0),
      tap((count) => this.realtime.unreadCount$.next(count))
    );
  }

  markAsRead(id: number): Observable<void> {
    return this.http.patch<any>(`${this.base}/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.realtime.unreadCount$.value;
        if (current > 0) this.realtime.unreadCount$.next(current - 1);
      }),
      map(() => undefined)
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.patch<any>(`${this.base}/mark-all-read`, {}).pipe(
      tap(() => this.realtime.unreadCount$.next(0)),
      map(() => undefined)
    );
  }
}
