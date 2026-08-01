import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export type AlertPeriod = '2_semaines' | '1_semaine' | 'veille';
export type ContactMethod = 'appel' | 'sms' | 'whatsapp';
export type ReminderStatus = 'pending' | 'contacted' | 'done';

export interface ReminderVehicleInput {
  registration: string;
  visit_expiration_date: string;
}

export interface ReminderSubmitPayload {
  station_id?: number | null;
  full_name: string;
  contact: string;
  vehicles: ReminderVehicleInput[];
  alert_period: AlertPeriod;
  contact_method: ContactMethod;
  consent_accepted: boolean;
}

export interface TechnicalVisitReminderRow {
  id: number;
  station_id: number | null;
  full_name: string;
  contact: string;
  alert_period: AlertPeriod;
  contact_method: ContactMethod;
  status: ReminderStatus;
  notes: string | null;
  created_at: string;
  vehicles: { id: number; registration: string; visit_expiration_date: string }[];
  station?: { id: number; name: string };
  handler?: { id: number; first_name: string; last_name: string };
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class TechnicalVisitReminderService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1`;

  /** Soumission publique depuis la page Fidelis Plus (sans authentification). */
  submit(payload: ReminderSubmitPayload): Observable<TechnicalVisitReminderRow> {
    return this.http
      .post<any>(`${this.base}/public/technical-visit-reminders`, payload)
      .pipe(map((res) => res.data));
  }

  /** Liste pour le call center marketing. */
  list(
    status?: string,
    page = 1,
    perPage = 20,
    visitDateFrom?: string,
    visitDateTo?: string,
  ): Observable<{ items: TechnicalVisitReminderRow[]; meta: PaginatedMeta }> {
    let params = new HttpParams().set('page', String(page)).set('per_page', String(perPage));
    if (status) params = params.set('status', status);
    if (visitDateFrom) params = params.set('visit_date_from', visitDateFrom);
    if (visitDateTo) params = params.set('visit_date_to', visitDateTo);
    return this.http.get<any>(`${this.base}/technical-visit-reminders`, { params }).pipe(
      map((res) => ({
        items: res.data ?? [],
        meta: res.meta ?? { current_page: 1, last_page: 1, total: 0 },
      })),
    );
  }

  update(id: number, payload: { status?: ReminderStatus; notes?: string }): Observable<TechnicalVisitReminderRow> {
    return this.http.patch<any>(`${this.base}/technical-visit-reminders/${id}`, payload).pipe(map((res) => res.data));
  }
}
