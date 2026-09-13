import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface ClientListMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ClientListResponse {
  data: any[];
  meta: ClientListMeta;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/accounts`;

  constructor(private http: HttpClient) {}

  // Liste paginée (côté serveur)
  getClients(params: {
    page?: number;
    per_page?: number;
    search?: string;
    sector?: string;
    status?: string;
    source?: string;
    vehicleCount?: string;
  } = {}): Observable<ClientListResponse> {
    let hp = new HttpParams();
    hp = hp.set('type', 'client');
    hp = hp.set('page', String(params.page ?? 1));
    hp = hp.set('per_page', String(params.per_page ?? 15));
    if (params.search) hp = hp.set('search', params.search);
    if (params.sector) hp = hp.set('sector', params.sector);
    if (params.status === 'active') hp = hp.set('is_active', '1');
    if (params.status === 'inactive') hp = hp.set('is_active', '0');
    if (params.source === 'odoo') hp = hp.set('created_via_odoo', '1');
    if (params.source === 'fidelis') hp = hp.set('created_via_odoo', '0');

    return this.http.get<any>(this.API_URL, { params: hp }).pipe(
      map(res => {
        console.log('[AccountService] getClients raw response:', res);
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const meta: ClientListMeta = res?.meta ?? {
          current_page: 1,
          last_page: 1,
          per_page: params.per_page ?? 15,
          total: data.length,
        };
        return { data, meta };
      })
    );
  }

  // Format retourné par show() : { status: ..., data: {...} }
  getClient(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(
      map(res => {
        console.log('[AccountService] getClient raw response:', res);
        return res?.data ?? res;
      })
    );
  }

  // Crée un client directement (sans passer par la prospection)
  createClient(data: any): Observable<any> {
    return this.http.post<any>(this.API_URL, { ...data, type: 'client' }).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Met à jour les informations d'un compte
  updateClient(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${id}`, data).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Ajoute un correspondant (contact) à un compte existant
  addContact(companyId: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${companyId}/contacts`, data).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Met à jour un correspondant existant
  updateContact(companyId: string | number, contactId: string | number, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/${companyId}/contacts/${contactId}`, data).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Supprime un correspondant
  deleteContact(companyId: string | number, contactId: string | number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${companyId}/contacts/${contactId}`).pipe(
      map(res => res)
    );
  }
}
