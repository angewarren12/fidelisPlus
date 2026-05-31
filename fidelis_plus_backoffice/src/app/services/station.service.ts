import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface Station {
  id: number;
  name: string;
  location?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class StationService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/stations`;

  list(): Observable<Station[]> {
    return this.http.get<any>(this.base).pipe(map(res => res.data ?? []));
  }

  get(id: number): Observable<Station> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(map(res => res.data));
  }

  create(payload: Partial<Station>): Observable<Station> {
    return this.http.post<any>(this.base, payload).pipe(map(res => res.data));
  }

  update(id: number, payload: Partial<Station>): Observable<Station> {
    return this.http.put<any>(`${this.base}/${id}`, payload).pipe(map(res => res.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<any>(`${this.base}/${id}`).pipe(map(() => undefined));
  }
}
