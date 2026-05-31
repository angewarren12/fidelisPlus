import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionContractService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/v1/accounts`;

  getContract(companyId: string | number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${companyId}/subscription-contract`).pipe(
      map(res => res?.data ?? res)
    );
  }

  saveContract(companyId: string | number, data: {
    subscriber_name: string;
    address_zone?: string;
    card_number?: string;
    subscription_date: string;
    reward_frequency: 'monthly' | 'quarterly';
    status: 'draft' | 'signed' | 'expired';
  }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/${companyId}/subscription-contract`, data).pipe(
      map(res => res?.data ?? res)
    );
  }
}
