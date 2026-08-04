import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

export interface AppSettings {
  'quote.legal.tva_rate'?: number;
  'quote.legal.validity_days'?: number;
  'quote.legal.footer_text'?: string;
  'quote.penalty.rate_6_months'?: number;
  'quote.penalty.rate_1_year'?: number;
  'notification.sms.visit_reminder'?: string;
  'notification.email.welcome_client'?: string;
  'notification.email.quote_sent'?: string;
  'pricing.visite_technique'?: Record<string, { visite: number; revisite: number; volontaire: number | null }>;
  'pricing.vignette'?: Record<string, Record<string, number>>;
  'pricing.visite_technique_categories'?: { key: string; label: string }[];
  'pricing.vignette_categories'?: { key: string; label: string }[];
  'pricing.additional_services'?: { key: string; label: string; price: number }[];
  'pricing.vignette_exemptions'?: { key: string; label: string; price: number }[];
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SettingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/settings`;

  public settings = signal<AppSettings | null>(null);

  /**
   * Load global app settings
   */
  loadSettings() {
    return this.http.get<AppSettings>(this.apiUrl).subscribe({
      next: (data) => this.settings.set(data),
      error: (err) => console.error('Failed to load settings', err)
    });
  }

  /**
   * Update global app settings (Admin only)
   */
  updateSettings(settings: AppSettings) {
    return this.http.put<{message: string}>(this.apiUrl, { settings });
  }
}
