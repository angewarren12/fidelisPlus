import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface QuoteRequest {
  id: number;
  user_id: number;
  company_id: number;
  vehicle_id: number;
  status: 'pending' | 'processed' | 'rejected';
  notes: string | null;
  registration_image: string | null;
  vignette_image: string | null;
  registration_image_url?: string;
  vignette_image_url?: string;
  created_at: string;
  user?: any;
  company?: any;
  vehicle?: any;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteRequestService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/v1/quote-requests`;
  private readonly API_ORIGIN = new URL(this.API_URL).origin;

  private absoluteUrl(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const v = String(raw).trim();
    if (!v) return undefined;
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith('//')) return `http:${v}`;
    if (v.startsWith('/')) return `${this.API_ORIGIN}${v}`;
    return `${this.API_ORIGIN}/${v}`;
  }

  private normalize(req: QuoteRequest): QuoteRequest {
    const registration = this.absoluteUrl(req.registration_image_url ?? req.registration_image);
    const vignette = this.absoluteUrl(req.vignette_image_url ?? req.vignette_image);
    return {
      ...req,
      registration_image_url: registration,
      vignette_image_url: vignette,
    };
  }

  // Liste des demandes en attente
  getPending(): Observable<QuoteRequest[]> {
    return this.http.get<any>(this.API_URL).pipe(
      map(res => {
        const data = res.data?.data || res.data || [];
        // Filtrer côté client si le backend ne le fait pas strictement pour l'admin
        return data
          .filter((req: QuoteRequest) => req.status === 'pending')
          .map((req: QuoteRequest) => this.normalize(req));
      })
    );
  }

  // Détail d'une demande avec images converties en URLs
  getById(id: number): Observable<QuoteRequest> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(
      map(res => this.normalize(res.data))
    );
  }

  // Mettre à jour le statut
  updateStatus(id: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/${id}/status`, { status });
  }
}
