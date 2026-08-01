import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface FleetStatsPayload {
  total: number;
  by_status: Record<string, number>;
}

export interface VehicleDocument {
  id: number;
  name: string;
  type: string;
  path: string;
}

export interface Vehicle {
  id: number;
  company_id: number;
  license_plate: string;
  brand: string;
  model: string;
  vehicle_type?: string | null;
  ptac_kg?: number | null;
  seats?: number | null;
  registration_date?: string | null;
  fiscal_power_cv?: number | null;
  ct_amount_ht?: number | null;
  ct_vat_amount?: number | null;
  ct_amount_ttc?: number | null;
  vignette_amount?: number | null;
  penalty_amount?: number | null;
  year: number | null;
  fuel_type: string | null;
  registration_doc_url?: string;
  vignette_doc_url?: string;
  last_visit: string | null;
  status: 'jamais_controle' | 'a_jour' | 'en_retard' | 'bientot' | string;
  has_required_doc?: boolean;
  documents?: VehicleDocument[];
  carte_grise?: { id: number; path: string } | null;
  vignette?: { id: number; path: string } | null;
  company?: any;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private readonly API_URL = `${environment.apiUrl}/api/v1/vehicles`;

  constructor(private http: HttpClient) {}

  private listFromResponse(res: any): { data: Vehicle[]; meta?: PaginatedMeta } {
    if (res?.data && Array.isArray(res.data) && res.meta) {
      return { data: res.data, meta: res.meta as PaginatedMeta };
    }
    if (Array.isArray(res?.data)) return { data: res.data };
    if (Array.isArray(res)) return { data: res };
    return { data: [] };
  }

  /** Liste paginée (flotte globale ou filtres). */
  getPage(filters: {
    company_id?: number;
    status?: string;
    statuses?: string;
    fuel_type?: string;
    search?: string;
    page?: number;
    per_page?: number;
  } = {}): Observable<{ data: Vehicle[]; meta: PaginatedMeta }> {
    let params = new HttpParams();
    if (filters.company_id != null) params = params.set('company_id', String(filters.company_id));
    if (filters.statuses) params = params.set('statuses', filters.statuses);
    else if (filters.status) params = params.set('status', filters.status);
    if (filters.fuel_type) params = params.set('fuel_type', filters.fuel_type);
    if (filters.search) params = params.set('search', filters.search);
    params = params.set('page', String(filters.page ?? 1));
    params = params.set('per_page', String(filters.per_page ?? 15));

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => {
        const { data, meta } = this.listFromResponse(res);
        return {
          data,
          meta: meta ?? {
            current_page: 1,
            last_page: 1,
            per_page: filters.per_page ?? 15,
            total: data.length,
          },
        };
      })
    );
  }

  getFleetStats(filters: {
    company_id?: number;
    status?: string;
    statuses?: string;
    fuel_type?: string;
    search?: string;
  } = {}): Observable<FleetStatsPayload> {
    let params = new HttpParams();
    if (filters.company_id != null) params = params.set('company_id', String(filters.company_id));
    if (filters.statuses) params = params.set('statuses', filters.statuses);
    else if (filters.status) params = params.set('status', filters.status);
    if (filters.fuel_type) params = params.set('fuel_type', filters.fuel_type);
    if (filters.search) params = params.set('search', filters.search);
    return this.http.get<{ status: string; data: FleetStatsPayload }>(`${this.API_URL}/stats/summary`, { params }).pipe(
      map(res => res.data)
    );
  }

  // Tous les véhicules (admin/commercial) — une page large (fiche client, devis)
  getAll(filters: { company_id?: number; status?: string; search?: string } = {}): Observable<Vehicle[]> {
    return this.getPage({ ...filters, page: 1, per_page: 500 }).pipe(map(r => r.data));
  }

  // Véhicules d'un client spécifique
  getByClient(companyId: number): Observable<Vehicle[]> {
    return this.getAll({ company_id: companyId });
  }

  // Obtenir un véhicule par son ID (Détails complets)
  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${id}`).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Ajouter un véhicule
  create(data: {
    company_id: number;
    license_plate: string;
    brand: string;
    model: string;
    year?: number | null;
    fuel_type?: string | null;
    last_visit_date?: string | null;
    vehicle_type?: string | null;
    ptac_kg?: number | null;
    seats?: number | null;
    registration_date?: string | null;
    fiscal_power_cv?: number | null;
    ct_amount_ht?: number | null;
    ct_vat_amount?: number | null;
    ct_amount_ttc?: number | null;
    vignette_amount?: number | null;
    penalty_amount?: number | null;
  }): Observable<Vehicle> {
    return this.http.post<any>(this.API_URL, data).pipe(
      map(res => res?.data ?? res)
    );
  }

  update(
    id: number,
    data: {
      company_id: number;
      license_plate: string;
      brand: string;
      model: string;
      year?: number | null;
      fuel_type?: string | null;
      last_visit_date?: string | null;
      vehicle_type?: string | null;
      ptac_kg?: number | null;
      seats?: number | null;
      registration_date?: string | null;
      fiscal_power_cv?: number | null;
      ct_amount_ht?: number | null;
      ct_vat_amount?: number | null;
      ct_amount_ttc?: number | null;
      vignette_amount?: number | null;
      penalty_amount?: number | null;
    }
  ): Observable<Vehicle> {
    return this.http.put<any>(`${this.API_URL}/${id}`, data).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Supprimer un véhicule
  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }

  // Upload d'un document pour un véhicule (Photo, Carte Grise, Vignette, etc.)
  uploadDocument(vehicleId: number, file: File, type: string, customName?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', customName || `${type} vehicule ${vehicleId}`);
    formData.append('type', type);

    return this.http.post<any>(`${this.API_URL}/${vehicleId}/documents`, formData).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Upload rapide (Carte Grise + Vignette)
  uploadQuickDocs(vehicleId: number, registrationFile?: File, vignetteFile?: File): Observable<any> {
    const formData = new FormData();
    if (registrationFile) formData.append('registration_doc', registrationFile);
    if (vignetteFile) formData.append('vignette_doc', vignetteFile);

    return this.http.post<any>(`${this.API_URL}/${vehicleId}/upload-docs`, formData).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Enregistrer une visite (entretien)
  recordVisit(vehicleId: number, payload: { date: string; notes?: string; vignetteFile?: File }): Observable<any> {
    const formData = new FormData();
    formData.append('date', payload.date);
    if (payload.notes?.trim()) formData.append('notes', payload.notes.trim());
    if (payload.vignetteFile) formData.append('vignette_image', payload.vignetteFile);

    return this.http.post<any>(`${this.API_URL}/${vehicleId}/visit`, formData).pipe(
      map(res => res?.data ?? res)
    );
  }

  // Télécharge le modèle Excel d'import de flotte
  downloadImportTemplate(): Observable<Blob> {
    return this.http.get(`${this.API_URL}/import/template`, { responseType: 'blob' });
  }

  // Import en masse de véhicules depuis un fichier Excel, pour un client existant (companyId)
  // ou un nouveau client à créer (companyName, si companyId omis).
  importFromExcel(target: { companyId?: number; companyName?: string }, file: File): Observable<VehicleImportResult> {
    const formData = new FormData();
    if (target.companyId != null) formData.append('company_id', String(target.companyId));
    else if (target.companyName) formData.append('company_name', target.companyName);
    formData.append('file', file);

    return this.http.post<any>(`${this.API_URL}/import`, formData).pipe(
      map(res => res?.data ?? res)
    );
  }
}

export interface VehicleImportError {
  row: number;
  license_plate: string | null;
  message: string;
}

export interface VehicleImportResult {
  company_id: number;
  company_name: string;
  created: number;
  errors_count: number;
  errors: VehicleImportError[];
}

