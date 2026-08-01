import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface LoyaltyAccountRow {
  id: number;
  public_uuid: string;
  holder_key: string;
  card_number: string;
  holder_type: string;
  company_id: number | null;
  user_id: number | null;
  points_balance: number;
  subscriber_name?: string | null;
  trade_register?: string | null;
  subscriber_function?: string | null;
  blocked_at?: string | null;
  total_vehicles_referred?: number;
  company?: { id: number; name: string; type?: string; category?: string; company_type?: string; phone?: string | null; created_via_marketing?: boolean };
  user?: { id: number; first_name: string; last_name: string; email?: string };
  member?: {
    id: number; type: string; nom: string | null; prenom: string | null; nom_entreprise: string | null; contact: string; email: string | null;
    status: 'pending' | 'validated' | 'rejected';
    sira_client_id: string | null;
    sira_provisioning_status: 'not_applicable' | 'pending' | 'provisioned' | 'failed';
  } | null;
  batch?: { id: number; status: 'generated' | 'printed' } | null;
  created_at?: string;
}

export interface LoyaltyScanHistoryRow {
  id: number;
  loyalty_account_id: number;
  points_credited: number;
  vehicle_registration: string | null;
  vehicle_brand: string | null;
  vehicle_color: string | null;
  visit_type: string | null;
  created_at: string;
  station?: { id: number; name: string };
  cashier?: { id: number; first_name: string; last_name: string };
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
  phone?: string | null;
  company_type?: string | null;
  category?: string | null;
  created_via_marketing?: boolean;
}

export interface BootstrapAccountResult {
  qr_payload: string;
  loyalty_account?: LoyaltyAccountRow;
}

/** Client fidélité propre au marketing — indépendant du CRM commercial. */
export interface LoyaltyMemberRow {
  id: number;
  type: 'particulier' | 'entreprise';
  nom: string | null;
  prenom: string | null;
  nom_entreprise: string | null;
  registre_commerce: string | null;
  nom_abonne: string | null;
  fonction: string | null;
  contact: string;
  email: string | null;
  sira_client_id: string | null;
  source: 'sira' | 'guichet' | 'marketing';
  status: 'pending' | 'validated' | 'rejected';
  requested_at: string | null;
  rejection_reason: string | null;
  sira_provisioning_status: 'not_applicable' | 'pending' | 'provisioned' | 'failed';
  created_at: string;
  loyalty_account?: LoyaltyAccountRow;
}

/** Studio Carte : modèle visuel (fond + positionnement % du QR et des champs texte). */
export interface LoyaltyCardTemplateLayout {
  qr_x: number; qr_y: number; qr_size: number;
  card_number_x: number; card_number_y: number; card_number_color: string; card_number_size: number;
}

export interface LoyaltyCardTemplateRow {
  id: number;
  name: string;
  type: 'particulier' | 'entreprise';
  background_path: string;
  background_url: string;
  layout_json: LoyaltyCardTemplateLayout;
  is_default: boolean;
  created_at: string;
}

export interface LoyaltyCardBatchRow {
  id: number;
  loyalty_card_template_id: number;
  quantity: number;
  card_number_from: string | null;
  card_number_to: string | null;
  status: 'generated' | 'printed';
  printed_at: string | null;
  created_at: string;
  template?: { id: number; name: string; type: 'particulier' | 'entreprise' };
  unassigned_count?: number;
  assigned_count?: number;
}

export interface CreateLoyaltyMemberPayload {
  type: 'particulier' | 'entreprise';
  contact: string;
  email?: string;
  nom?: string;
  prenom?: string;
  nom_entreprise?: string;
  registre_commerce?: string;
  nom_abonne?: string;
  fonction?: string;
}

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/loyalty`;

  listAccounts(page = 1, perPage = 20, filters: { holder_type?: string; search?: string; batch_status?: string } = {}): Observable<{ items: LoyaltyAccountRow[]; meta: PaginatedMeta }> {
    let params = new HttpParams().set('page', String(page)).set('per_page', String(perPage));
    if (filters.holder_type) params = params.set('holder_type', filters.holder_type);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.batch_status) params = params.set('batch_status', filters.batch_status);
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

  bootstrapAccount(opts: {
    company_id?: number;
    user_id?: number;
    qr_payload?: string;
    subscriber_name?: string;
    trade_register?: string;
    subscriber_function?: string;
  }): Observable<BootstrapAccountResult> {
    return this.http.post<any>(`${this.base}/accounts/bootstrap`, opts).pipe(
      map((res) => ({
        qr_payload: res.data?.qr_payload ?? '',
        loyalty_account: res.data?.loyalty_account,
      })),
    );
  }

  associateCard(accountId: number, qrPayload: string): Observable<BootstrapAccountResult> {
    return this.http.post<any>(`${this.base}/accounts/${accountId}/associate-card`, { qr_payload: qrPayload }).pipe(
      map((res) => ({
        qr_payload: res.data?.qr_payload ?? '',
        loyalty_account: res.data?.loyalty_account,
      })),
    );
  }

  updateAccount(
    accountId: number,
    payload: { subscriber_name?: string; trade_register?: string; subscriber_function?: string; blocked?: boolean },
  ): Observable<LoyaltyAccountRow> {
    return this.http.patch<any>(`${this.base}/accounts/${accountId}`, payload).pipe(map((res) => res.data));
  }

  getScanHistory(accountId: number, page = 1, perPage = 20): Observable<{ items: LoyaltyScanHistoryRow[]; meta: PaginatedMeta }> {
    const params = new HttpParams().set('page', String(page)).set('per_page', String(perPage));
    return this.http.get<any>(`${this.base}/accounts/${accountId}/scan-history`, { params }).pipe(
      map((res) => ({
        items: res.data ?? [],
        meta: res.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
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

  createCompany(payload: { name: string; phone?: string }): Observable<LoyaltyCompanyOption> {
    return this.http.post<any>(`${this.base}/lookup/companies`, payload).pipe(map((res) => res.data));
  }

  createClientUser(payload: { first_name: string; last_name: string; phone?: string; email?: string }): Observable<LoyaltyClientUserOption> {
    return this.http.post<any>(`${this.base}/lookup/client-users`, payload).pipe(map((res) => res.data));
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

  // ─── Clients fidélité marketing (indépendants du CRM) ───────────────────────

  listMembers(params: { page?: number; per_page?: number; type?: string; search?: string } = {}): Observable<{ items: LoyaltyMemberRow[]; meta: PaginatedMeta }> {
    let hp = new HttpParams().set('page', String(params.page ?? 1)).set('per_page', String(params.per_page ?? 20));
    if (params.type) hp = hp.set('type', params.type);
    if (params.search) hp = hp.set('search', params.search);
    return this.http.get<any>(`${this.base}/members`, { params: hp }).pipe(
      map((res) => ({
        items: res.data ?? [],
        meta: res.meta ?? { current_page: 1, last_page: 1, per_page: params.per_page ?? 20, total: 0 },
      })),
    );
  }

  createMember(payload: CreateLoyaltyMemberPayload): Observable<{ member: LoyaltyMemberRow }> {
    return this.http.post<any>(`${this.base}/members`, payload).pipe(map((res) => res.data));
  }

  updateMember(id: number, payload: Partial<CreateLoyaltyMemberPayload>): Observable<LoyaltyMemberRow> {
    return this.http.patch<any>(`${this.base}/members/${id}`, payload).pipe(map((res) => res.data));
  }

  listMemberRequests(): Observable<LoyaltyMemberRow[]> {
    return this.http.get<any>(`${this.base}/members/requests`).pipe(map((res) => res.data));
  }

  validateMemberRequest(id: number): Observable<{ member: LoyaltyMemberRow; loyalty_account: LoyaltyAccountRow; qr_payload: string }> {
    return this.http.post<any>(`${this.base}/members/${id}/validate`, {}).pipe(map((res) => res.data));
  }

  rejectMemberRequest(id: number, reason?: string): Observable<LoyaltyMemberRow> {
    return this.http.post<any>(`${this.base}/members/${id}/reject`, { reason }).pipe(map((res) => res.data));
  }

  retryMemberSiraProvisioning(id: number): Observable<LoyaltyMemberRow> {
    return this.http.post<any>(`${this.base}/members/${id}/retry-provisioning`, {}).pipe(map((res) => res.data));
  }

  // ─── Studio Carte (modèles visuels) ──────────────────────────────────────────

  listCardTemplates(type?: 'particulier' | 'entreprise'): Observable<LoyaltyCardTemplateRow[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<any>(`${this.base}/card-templates`, { params }).pipe(map((res) => res.data ?? []));
  }

  createCardTemplate(payload: { name: string; type: string; background: File; layout: LoyaltyCardTemplateLayout; is_default?: boolean }): Observable<LoyaltyCardTemplateRow> {
    const fd = new FormData();
    fd.append('name', payload.name);
    fd.append('type', payload.type);
    fd.append('background', payload.background);
    fd.append('layout_json', JSON.stringify(payload.layout));
    if (payload.is_default) fd.append('is_default', '1');
    return this.http.post<any>(`${this.base}/card-templates`, fd).pipe(map((res) => res.data));
  }

  updateCardTemplate(id: number, payload: { name?: string; background?: File; layout?: LoyaltyCardTemplateLayout; is_default?: boolean }): Observable<LoyaltyCardTemplateRow> {
    const fd = new FormData();
    if (payload.name) fd.append('name', payload.name);
    if (payload.background) fd.append('background', payload.background);
    if (payload.layout) fd.append('layout_json', JSON.stringify(payload.layout));
    if (payload.is_default) fd.append('is_default', '1');
    return this.http.post<any>(`${this.base}/card-templates/${id}`, fd).pipe(map((res) => res.data));
  }

  deleteCardTemplate(id: number): Observable<void> {
    return this.http.delete<any>(`${this.base}/card-templates/${id}`).pipe(map(() => undefined));
  }

  // ─── Génération de cartes vierges en masse (PDF) ─────────────────────────────

  generateCardBatch(templateId: number, quantity: number): Observable<Blob> {
    return this.http.post(`${this.base}/card-batches`, { template_id: templateId, quantity }, { responseType: 'blob' });
  }

  listCardBatches(page = 1, perPage = 20): Observable<{ items: LoyaltyCardBatchRow[]; meta: PaginatedMeta }> {
    const params = new HttpParams().set('page', String(page)).set('per_page', String(perPage));
    return this.http.get<any>(`${this.base}/card-batches`, { params }).pipe(
      map((res) => ({
        items: res.data ?? [],
        meta: res.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 },
      })),
    );
  }

  downloadCardBatch(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/card-batches/${id}/download`, { responseType: 'blob' });
  }

  markCardBatchPrinted(id: number): Observable<LoyaltyCardBatchRow> {
    return this.http.patch<any>(`${this.base}/card-batches/${id}/status`, { status: 'printed' }).pipe(map((res) => res.data));
  }

  // ─── Association d'une carte physique déjà imprimée à un client ─────────────

  assignCard(memberId: number, qrPayload: string): Observable<{ member: LoyaltyMemberRow; loyalty_account: LoyaltyAccountRow }> {
    return this.http.post<any>(`${this.base}/members/${memberId}/assign-card`, { qr_payload: qrPayload }).pipe(map((res) => res.data));
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
  card_number?: string | null;
  holder_name: string;
  caissier: string;
  vehicle_registration?: string | null;
  vehicle_brand?: string | null;
  vehicle_color?: string | null;
  visit_type?: string | null;
  created_at: string;
}

export interface LoyaltySettingRow {
  id: number;
  key: string;
  label: string;
  value: string;
  description?: string;
}
