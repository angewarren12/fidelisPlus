import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface LoyaltyAccountRow {
  id: number;
  public_uuid: string;
  holder_key: string;
  holder_type: string;
  company_id: number | null;
  user_id: number | null;
  points_balance: number;
  total_vehicles_referred?: number;
  milestone_apporteur_50_reached_at?: string | null;
  milestone_flotte_20_reached_at?: string | null;
  milestone_flotte_50_reached_at?: string | null;
  milestone_flotte_100_reached_at?: string | null;
  company?: { id: number; name: string; type?: string; category?: string; company_type?: string };
  user?: { id: number; first_name: string; last_name: string; email?: string };
}

export interface LoyaltyRewardRow {
  id: number;
  name: string;
  description: string | null;
  points_cost: number;
  client_segments: string[] | null;
  is_active: boolean;
  sort_order: number;
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface StationScanReport {
  period: { from: string; to: string; timezone: string };
  totals: { scans_count: number; points_credited: number };
  by_station: {
    station_id: number;
    station_name: string;
    scans_count: number;
    points_credited: number;
  }[];
  by_day: { day: string; scans_count: number; points_credited: number }[];
}

export interface LoyaltyClientUserOption {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  company_id?: number | null;
}

export interface LoyaltyCompanyOption {
  id: number;
  name: string;
  company_type?: string | null;
  category?: string | null;
}

export interface BootstrapAccountResult {
  qr_payload: string;
  loyalty_account?: LoyaltyAccountRow;
}

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/loyalty`;

  listAccounts(page = 1, perPage = 20): Observable<{ items: LoyaltyAccountRow[]; meta: PaginatedMeta }> {
    const params = new HttpParams().set('page', String(page)).set('per_page', String(perPage));
    return this.http.get<any>(`${this.base}/accounts`, { params }).pipe(
      map((res) => ({
        items: res.data ?? [],
        meta: res.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
      })),
    );
  }

  listRewards(activeOnly = false): Observable<LoyaltyRewardRow[]> {
    let params = new HttpParams();
    if (activeOnly) params = params.set('active_only', '1');
    return this.http.get<any>(`${this.base}/rewards`, { params }).pipe(map((res) => res.data ?? []));
  }

  createReward(payload: Partial<LoyaltyRewardRow>): Observable<LoyaltyRewardRow> {
    return this.http.post<any>(`${this.base}/rewards`, payload).pipe(map((res) => res.data));
  }

  updateReward(id: number, payload: Partial<LoyaltyRewardRow>): Observable<LoyaltyRewardRow> {
    return this.http.patch<any>(`${this.base}/rewards/${id}`, payload).pipe(map((res) => res.data));
  }

  deleteReward(id: number): Observable<void> {
    return this.http.delete<any>(`${this.base}/rewards/${id}`).pipe(map(() => undefined));
  }

  bootstrapAccount(opts: { company_id?: number; user_id?: number; qr_payload?: string }): Observable<BootstrapAccountResult> {
    return this.http.post<any>(`${this.base}/accounts/bootstrap`, opts).pipe(
      map((res) => ({
        qr_payload: res.data?.qr_payload ?? '',
        loyalty_account: res.data?.loyalty_account,
      })),
    );
  }

  getQrPayload(accountId: number, regenerate = false): Observable<{ qr_payload: string }> {
    let params = new HttpParams();
    if (regenerate) params = params.set('regenerate', '1');
    return this.http.get<any>(`${this.base}/accounts/${accountId}/qr-payload`, { params }).pipe(
      map((res) => ({ qr_payload: res.data?.qr_payload ?? '' })),
    );
  }

  adjustPoints(accountId: number, delta_points: number, reason: string): Observable<{ new_balance: number }> {
    return this.http
      .post<any>(`${this.base}/accounts/${accountId}/adjust`, { delta_points, reason })
      .pipe(map((res) => res.data));
  }

  stationScanReport(params: {
    date?: string;
    from?: string;
    to?: string;
    station_id?: number | null;
  }): Observable<StationScanReport> {
    let hp = new HttpParams();
    if (params.date) {
      hp = hp.set('date', params.date);
    } else if (params.from && params.to) {
      hp = hp.set('from', params.from).set('to', params.to);
    }
    if (params.station_id != null && params.station_id > 0) {
      hp = hp.set('station_id', String(params.station_id));
    }
    return this.http.get<any>(`${this.base}/reports/station-scans`, { params: hp }).pipe(map((res) => res.data));
  }

  searchClientUsers(search: string, limit = 40): Observable<LoyaltyClientUserOption[]> {
    const params = new HttpParams().set('search', search).set('limit', String(limit));
    return this.http.get<any>(`${this.base}/lookup/client-users`, { params }).pipe(map((res) => res.data ?? []));
  }

  searchCompanies(search: string, limit = 40): Observable<LoyaltyCompanyOption[]> {
    const params = new HttpParams().set('search', search).set('limit', String(limit));
    return this.http.get<any>(`${this.base}/lookup/companies`, { params }).pipe(map((res) => res.data ?? []));
  }

  listStations(): Observable<{ id: number; name: string }[]> {
    return this.http
      .get<any>(`${environment.apiUrl}/api/v1/stations`)
      .pipe(map((res) => res.data ?? []));
  }

  referralStats(): Observable<{ total_referrals: number; top_referrers: { id: number; name: string; referrals_count: number }[] }> {
    return this.http.get<any>(`${this.base}/stats/referrals`).pipe(map((res) => res.data));
  }

  listRedemptions(status?: string, page = 1, perPage = 20): Observable<{ items: LoyaltyRedemptionRow[]; meta: PaginatedMeta }> {
    let params = new HttpParams().set('page', String(page)).set('per_page', String(perPage));
    if (status) params = params.set('status', status);
    return this.http.get<any>(`${this.base}/redemptions`, { params }).pipe(
      map((res) => ({
        items: res.data ?? [],
        meta: res.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
      })),
    );
  }

  claimReward(loyalty_account_id: number, loyalty_reward_id: number): Observable<LoyaltyRedemptionRow> {
    return this.http.post<any>(`${this.base}/redemptions`, { loyalty_account_id, loyalty_reward_id }).pipe(map((res) => res.data));
  }

  updateRedemptionStatus(id: number, status: 'delivered' | 'cancelled', notes?: string): Observable<LoyaltyRedemptionRow> {
    return this.http
      .patch<any>(`${this.base}/redemptions/${id}`, { status, notes })
      .pipe(map((res) => res.data));
  }

  /** Flux scans — back-office (admin / marketing / commercial filtré). */
  getActivity(limit = 20): Observable<LoyaltyActivityItem[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<any>(`${this.base}/activity`, { params }).pipe(map((r) => r.data ?? []));
  }

  getSettings(): Observable<LoyaltySettingRow[]> {
    return this.http.get<any>(`${this.base}/settings`).pipe(map((r) => r.data ?? []));
  }

  updateSetting(id: number, value: string): Observable<LoyaltySettingRow> {
    return this.http.put<any>(`${this.base}/settings/${id}`, { value }).pipe(map((r) => r.data));
  }
}

export interface LoyaltyRedemptionRow {
  id: number;
  loyalty_account_id: number;
  loyalty_reward_id: number;
  points_cost: number;
  status: 'pending' | 'delivered' | 'cancelled';
  notes: string | null;
  handled_by: number | null;
  created_at: string;
  updated_at: string;
  account?: LoyaltyAccountRow;
  reward?: LoyaltyRewardRow;
  handler?: { id: number; first_name: string; last_name: string };
}

export interface LoyaltyActivityItem {
  type: string;
  id: number;
  title: string;
  description: string;
  points: number;
  holder_name: string;
  caissier: string;
  created_at: string;
}

export interface LoyaltySettingRow {
  id: number;
  key: string;
  label: string;
  value: string;
  description?: string;
}
