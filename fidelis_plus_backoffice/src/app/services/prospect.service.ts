import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError } from 'rxjs';
import { CreateProspectDto, Prospect } from '../models/prospect.model';
import { environment } from '../environments/environment';

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ProspectListResponse {
  data: Prospect[];
  meta: PaginatedMeta;
  summary: { pipeline_total: number; hot_count: number };
}

@Injectable({
  providedIn: 'root'
})
export class ProspectService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/prospects`;

  constructor(private http: HttpClient) {}

  getProspectsPage(params: {
    page?: number;
    per_page?: number;
    search?: string;
    temperature?: string;
    sector?: string;
    lead_source?: string;
    commercial_id?: number;
    company_type?: string;
  } = {}): Observable<ProspectListResponse> {
    let hp = new HttpParams();
    hp = hp.set('page', String(params.page ?? 1));
    hp = hp.set('per_page', String(params.per_page ?? 15));
    if (params.search) hp = hp.set('search', params.search);
    if (params.temperature) hp = hp.set('temperature', params.temperature);
    if (params.sector) hp = hp.set('sector', params.sector);
    if (params.lead_source) hp = hp.set('lead_source', params.lead_source);
    if (params.commercial_id != null) hp = hp.set('commercial_id', String(params.commercial_id));
    if (params.company_type) hp = hp.set('company_type', params.company_type);

    return this.http.get<any>(this.API_URL, { params: hp }).pipe(
      map((res) => ({
        data: Array.isArray(res?.data) ? res.data : [],
        meta: res.meta ?? {
          current_page: 1,
          last_page: 1,
          per_page: params.per_page ?? 15,
          total: 0,
        },
        summary: res.summary ?? { pipeline_total: 0, hot_count: 0 },
      })),
      catchError(err => {
        console.error('Erreur lors de la récupération des prospects:', err);
        throw err;
      })
    );
  }

  /** @deprecated Préférer getProspectsPage — conservé pour compat. */
  getProspects(temperature?: string): Observable<Prospect[]> {
    return this.getProspectsPage({ temperature, per_page: 500, page: 1 }).pipe(map(r => r.data));
  }

  getSectors(): Observable<string[]> {
    return this.http.get<{data: string[]}>(`${this.API_URL}/sectors`).pipe(
      map((res: {data: string[]}) => res.data)
    );
  }

  getLeadSources(): Observable<string[]> {
    return this.http.get<{data: string[]}>(`${this.API_URL}/lead-sources`).pipe(
      map((res: {data: string[]}) => res.data)
    );
  }

  createProspect(data: CreateProspectDto): Observable<Prospect> {
    return this.http.post<{data: Prospect}>(this.API_URL, data).pipe(
      map((res: {data: Prospect}) => res.data)
    );
  }

  getProspect(id: number): Observable<Prospect> {
    return this.http.get<{data: Prospect}>(`${this.API_URL}/${id}`).pipe(
      map((res: {data: Prospect}) => res.data)
    );
  }

  updateProspect(id: number, data: Omit<CreateProspectDto, 'contact_email'>): Observable<Prospect> {
    return this.http.put<{data: Prospect}>(`${this.API_URL}/${id}`, data).pipe(
      map((res: {data: Prospect}) => res.data)
    );
  }

  convertToClient(id: number): Observable<Prospect> {
    return this.http.patch<{data: Prospect}>(`${this.API_URL}/${id}/convert`, {}).pipe(
      map((res: {data: Prospect}) => res.data)
    );
  }

  updateTemperature(id: number, temperature: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}/temperature`, { temperature }).pipe(
      catchError(err => {
        console.error('Erreur MAJ température:', err);
        throw err;
      })
    );
  }
}
