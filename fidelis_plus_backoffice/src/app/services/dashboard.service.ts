import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface DashboardStats {
  revenue: {
    total_accepted: number;
    new_quotes_count: number;
  };
  crm: {
    total_prospects: number;
    total_clients: number;
    conversion_rate: number;
  };
  fleet: {
    a_jour: number;
    bientot: number;
    en_retard: number;
  };
  agenda: any[];
  alerts: {
    overdue_vehicles: number;
    pending_quotes: number;
    pending_requests: number;
  };
  recent_quotes?: any[];
  inspections_weekly?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/v1/stats/dashboard`;

  getStats(commercialId?: number): Observable<DashboardStats> {
    let url = this.API_URL;
    if (commercialId) {
       url += `?commercial_id=${commercialId}`;
    }
    return this.http.get<any>(url).pipe(
      map(res => res.data)
    );
  }
}
