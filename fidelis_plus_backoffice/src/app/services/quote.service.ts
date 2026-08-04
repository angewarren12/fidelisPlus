import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface QuoteItem {
  description: string;
  price: number;
  quantity: number;
  saved?: boolean;
}

export interface Quote {
  id?: number;
  company_id: number;
  quote_request_id?: number;
  quote_number?: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  total_amount: number;
  currency?: string;
  valid_until?: string;
  payment_term_id?: number | null;
  payment_term?: { id: number; label: string; description?: string | null } | null;
  items: QuoteItem[];
  company?: any;
  vehicles?: any[];
  bon_de_commande_url?: string | null;
}

export interface QuoteListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface QuoteListSummary {
  total: number;
  by_status: {
    draft: number;
    sent: number;
    accepted: number;
    declined: number;
    expired: number;
  };
  pipeline_value: number;
  signed_revenue: number;
}

export interface QuoteListResponse {
  data: Quote[];
  meta: QuoteListMeta;
  summary: QuoteListSummary;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/v1/quotes`;

  /** Liste paginée avec recherche et filtre statut. */
  getPage(params: {
    company_id?: number;
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
  } = {}): Observable<QuoteListResponse> {
    let hp = new HttpParams();
    hp = hp.set('page', String(params.page ?? 1));
    hp = hp.set('per_page', String(params.per_page ?? 15));
    if (params.company_id != null) hp = hp.set('company_id', String(params.company_id));
    if (params.search) hp = hp.set('search', params.search);
    if (params.status) hp = hp.set('status', params.status);

    return this.http.get<any>(this.API_URL, { params: hp }).pipe(
      map((res) => ({
        data: Array.isArray(res?.data) ? res.data : [],
        meta: res.meta ?? {
          current_page: 1,
          last_page: 1,
          per_page: params.per_page ?? 15,
          total: 0,
        },
        summary: res.summary ?? {
          total: 0,
          by_status: { draft: 0, sent: 0, accepted: 0, declined: 0, expired: 0 },
          pipeline_value: 0,
          signed_revenue: 0,
        },
      }))
    );
  }

  /** Liste complète (grosse page) — préférer getPage pour l’UI. */
  getAll(companyId?: number): Observable<Quote[]> {
    return this.getPage({ company_id: companyId, page: 1, per_page: 500 }).pipe(map((r) => r.data));
  }

  // Détail d'un devis
  getById(id: number): Observable<Quote> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(
      map(res => res.data)
    );
  }

  // Création d'un devis
  create(quote: Quote): Observable<Quote> {
    return this.http.post<any>(this.API_URL, quote).pipe(
      map(res => res.data)
    );
  }

  /** Mise à jour complète d'un brouillon (lignes, véhicules, montants). */
  update(
    id: number,
    payload: {
      company_id: number;
      quote_number?: string;
      vehicle_ids: number[];
      items: QuoteItem[];
      total_amount?: number;
      quote_request_id?: number;
      valid_until?: string;
      status?: 'draft' | 'sent';
    }
  ): Observable<Quote> {
    return this.http.patch<any>(`${this.API_URL}/${id}`, payload).pipe(
      map(res => res.data)
    );
  }

  // Mise à jour du statut (déclenche la notification + l'email réel si passé à 'sent')
  updateStatus(id: number, status: string, options: { email?: string; message?: string } = {}): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/${id}/status`, { status, ...options });
  }

  // Upload du bon de commande (par le client, ou par le commercial pour le compte du client)
  uploadBonDeCommande(id: number, file: File): Observable<Quote> {
    const formData = new FormData();
    formData.append('bon_de_commande', file);
    return this.http.post<any>(`${this.API_URL}/${id}/upload-accord`, formData).pipe(
      map(res => res.data)
    );
  }
}
