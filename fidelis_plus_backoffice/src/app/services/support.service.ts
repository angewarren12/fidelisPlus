import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  staff_reply: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private base = `${environment.apiUrl}/api/v1/support`;

  constructor(private http: HttpClient) {}

  list(): Observable<SupportTicket[]> {
    return this.http.get<any>(this.base).pipe(
      map(res => Array.isArray(res?.data) ? res.data : [])
    );
  }

  create(payload: { subject: string; message: string }): Observable<SupportTicket> {
    return this.http.post<any>(this.base, payload).pipe(
      map(res => res?.data ?? res)
    );
  }
}
