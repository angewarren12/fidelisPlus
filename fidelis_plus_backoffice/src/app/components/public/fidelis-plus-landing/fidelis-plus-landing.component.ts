import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  TechnicalVisitReminderService,
  AlertPeriod,
  ContactMethod,
  ReminderVehicleInput,
} from '../../../services/technical-visit-reminder.service';

@Component({
  selector: 'app-fidelis-plus-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fidelis-plus-landing.component.html',
  styles: [`
    .animate-slide-up {
      animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1);
      opacity: 0.5;
    }
    /* Custom checkbox style */
    input[type="checkbox"]:checked + div {
      background-color: #15b9a3;
      border-color: #15b9a3;
    }
    input[type="checkbox"]:checked + div span {
      opacity: 1;
    }
  `],
})
export class FidelisPlusLandingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private reminderService = inject(TechnicalVisitReminderService);

  showForm = signal(false);
  submitting = signal(false);
  submitted = signal(false);
  errorMessage = signal<string | null>(null);

  stationId: number | null = null;

  fullName = '';
  contact = '';
  vehicles: ReminderVehicleInput[] = [{ registration: '', visit_expiration_date: '' }];
  alertPeriod: AlertPeriod = '1_semaine';
  contactMethod: ContactMethod = 'appel';
  consentAccepted = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((p) => {
      const sid = p['station'] ?? p['station_id'];
      this.stationId = sid ? Number(sid) : null;
    });
  }

  startForm(): void {
    this.showForm.set(true);
  }

  addVehicle(): void {
    if (this.vehicles.length >= 10) return;
    this.vehicles.push({ registration: '', visit_expiration_date: '' });
  }

  removeVehicle(index: number): void {
    if (this.vehicles.length <= 1) return;
    this.vehicles.splice(index, 1);
  }

  submit(): void {
    this.errorMessage.set(null);

    if (!this.fullName.trim() || !this.contact.trim()) {
      this.errorMessage.set('Indiquez votre nom et un contact.');
      return;
    }

    const vehicles = this.vehicles
      .map((v) => ({ registration: v.registration.trim(), visit_expiration_date: v.visit_expiration_date }))
      .filter((v) => v.registration && v.visit_expiration_date);

    if (vehicles.length === 0) {
      this.errorMessage.set('Indiquez au moins un véhicule avec sa date d’expiration de visite.');
      return;
    }

    if (!this.consentAccepted) {
      this.errorMessage.set('Merci de confirmer avoir lu et accepté la mention sur les données personnelles.');
      return;
    }

    this.submitting.set(true);
    this.reminderService
      .submit({
        station_id: this.stationId,
        full_name: this.fullName.trim(),
        contact: this.contact.trim(),
        vehicles,
        alert_period: this.alertPeriod,
        contact_method: this.contactMethod,
        consent_accepted: true,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Une erreur est survenue. Réessayez.');
        },
      });
  }
}
