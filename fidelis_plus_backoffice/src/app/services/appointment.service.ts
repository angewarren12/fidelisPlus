import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

export interface TimeSlot {
  time: string;
  is_full: boolean;
  available_spots: number;
}

export interface Appointment {
  id: number;
  company_id: number;
  vehicle_id: number;
  station_id: number;
  appointment_date: string;
  is_pass_express: boolean;
  status: 'confirme' | 'annule' | 'termine';
  created_at: string;
  company?: any;
  vehicle?: any;
  station?: any;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/appointments`;

  /** Liste des rendez-vous pour une station donnée (scoped côté backend par rôle). */
  list(stationId: number): Observable<Appointment[]> {
    const params = new HttpParams().set('station_id', String(stationId));
    return this.http.get<any>(this.base, { params }).pipe(
      map(res => res.data ?? [])
    );
  }

  /** Tous les rendez-vous du client connecté (on récupère pour toutes les stations). */
  listAll(): Observable<Appointment[]> {
    // Le backend scope automatiquement par company_id pour les clients
    // On passe station_id=0 mais le backend retourne tout pour le client
    return this.http.get<any>(this.base, { params: { station_id: '0' } }).pipe(
      map(res => {
        const data = res.data ?? res;
        return Array.isArray(data) ? data : [];
      })
    );
  }

  /** Créneaux disponibles pour une station et une date. */
  getSlots(stationId: number, date: string): Observable<TimeSlot[]> {
    const params = new HttpParams()
      .set('station_id', String(stationId))
      .set('date', date);
    return this.http.get<any>(`${this.base}/slots`, { params }).pipe(
      map(res => res.data ?? [])
    );
  }

  /** Réserver un rendez-vous. */
  book(payload: {
    vehicle_id: number;
    station_id: number;
    appointment_date: string;
    is_pass_express?: boolean;
  }): Observable<Appointment> {
    return this.http.post<any>(this.base, payload).pipe(
      map(res => res.data)
    );
  }

  /** Annuler un rendez-vous. */
  cancel(id: number): Observable<any> {
    return this.http.patch<any>(`${this.base}/${id}/cancel`, {});
  }
}
