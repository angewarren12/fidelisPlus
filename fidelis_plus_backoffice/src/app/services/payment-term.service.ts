import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface PaymentTerm {
  id: number;
  label: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentTermService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/payment-terms`;

  /** @param all Inclut aussi les conditions désactivées (réservé à l'écran d'admin). */
  list(all = false): Observable<PaymentTerm[]> {
    const params = all ? new HttpParams().set('all', '1') : undefined;
    return this.http.get<any>(this.base, { params }).pipe(map((res) => res.data ?? []));
  }

  create(payload: Partial<PaymentTerm>): Observable<PaymentTerm> {
    return this.http.post<any>(this.base, payload).pipe(map((res) => res.data));
  }

  update(id: number, payload: Partial<PaymentTerm>): Observable<PaymentTerm> {
    return this.http.put<any>(`${this.base}/${id}`, payload).pipe(map((res) => res.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(map(() => undefined));
  }
}
