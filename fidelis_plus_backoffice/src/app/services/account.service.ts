import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/accounts`;

  constructor(private http: HttpClient) {}

  // Format retourné par CompanyResource::collection :
  // { data: [...], links: {}, meta: {} }
  getClients(): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}?type=client&limit=100`).pipe(
      map(res => {
        console.log('[AccountService] getClients raw response:', res);
        if (Array.isArray(res?.data)) {
          return res.data;
        }
        if (Array.isArray(res)) {
          return res;
        }
        return [];
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
}

