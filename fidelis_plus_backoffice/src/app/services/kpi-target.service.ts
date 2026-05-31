import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export type PeriodType = 'month' | 'quarter' | 'year';

export interface KpiTarget {
  id: number;
  commercial_id: number;
  period_type: PeriodType;
  period_year: number;
  period_month: number | null;
  period_quarter: number | null;
  target_clients: number;
  target_revenue_signed: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface KpiProgressResponse {
  period: {
    type: PeriodType;
    year: number;
    month: number | null;
    quarter: number | null;
    start: string;
    end: string;
  };
  target: KpiTarget | null;
  actuals: {
    clients: number;
    revenue_signed: number;
  };
  progress: {
    clients_pct: number | null;
    revenue_signed_pct: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class KpiTargetService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/v1/kpi-targets`;

  upsert(payload: {
    commercial_id: number;
    period_type: PeriodType;
    year: number;
    month?: number;
    quarter?: number;
    target_clients?: number;
    target_revenue_signed?: number;
  }): Observable<KpiTarget> {
    return this.http.post<{ status: string; data: KpiTarget }>(this.API_URL, payload).pipe(map((r) => r.data));
  }

  getProgress(params: {
    commercial_id: number;
    period_type: PeriodType;
    year: number;
    month?: number;
    quarter?: number;
  }): Observable<KpiProgressResponse> {
    let hp = new HttpParams()
      .set('commercial_id', String(params.commercial_id))
      .set('period_type', params.period_type)
      .set('year', String(params.year));
    if (params.period_type === 'month' && params.month) hp = hp.set('month', String(params.month));
    if (params.period_type === 'quarter' && params.quarter) hp = hp.set('quarter', String(params.quarter));
    return this.http
      .get<{ status: string; data: KpiProgressResponse }>(`${this.API_URL}/progress`, { params: hp })
      .pipe(map((r) => r.data));
  }
}

