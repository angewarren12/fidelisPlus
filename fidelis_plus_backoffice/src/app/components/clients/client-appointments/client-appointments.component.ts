import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AppointmentService, Appointment, TimeSlot } from '../../../services/appointment.service';
import { StationService, Station } from '../../../services/station.service';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-client-appointments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="animate-fade-in-up space-y-8 pb-20">

      <!-- HEADER -->
      <section class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Mes Rendez-vous</h1>
          <p class="text-outline text-sm font-medium mt-1">Planifiez vos inspections et suivez l'historique de vos rendez-vous.</p>
        </div>
        <button (click)="openBookingModal()"
                class="px-5 py-3 bg-[#15b9a3] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/20 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">calendar_add_on</span>
          Prendre rendez-vous
        </button>
      </section>

      <!-- SUMMARY CARDS -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-[1.5rem] border border-outline-variant/10 shadow-sm border-l-4 border-l-primary">
          <div class="flex items-center justify-between mb-3">
            <span class="material-symbols-outlined text-primary text-2xl">event_available</span>
            <span class="text-[10px] font-black text-primary uppercase tracking-widest">Confirmés</span>
          </div>
          <h3 class="text-3xl font-headline font-black text-on-surface">{{ countByStatus('confirme') }}</h3>
        </div>
        <div class="bg-white p-6 rounded-[1.5rem] border border-outline-variant/10 shadow-sm border-l-4 border-l-emerald-500">
          <div class="flex items-center justify-between mb-3">
            <span class="material-symbols-outlined text-emerald-500 text-2xl">check_circle</span>
            <span class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Terminés</span>
          </div>
          <h3 class="text-3xl font-headline font-black text-on-surface">{{ countByStatus('termine') }}</h3>
        </div>
        <div class="bg-white p-6 rounded-[1.5rem] border border-outline-variant/10 shadow-sm border-l-4 border-l-error">
          <div class="flex items-center justify-between mb-3">
            <span class="material-symbols-outlined text-error text-2xl">cancel</span>
            <span class="text-[10px] font-black text-error uppercase tracking-widest">Annulés</span>
          </div>
          <h3 class="text-3xl font-headline font-black text-error">{{ countByStatus('annule') }}</h3>
        </div>
      </section>

      <!-- APPOINTMENTS LIST -->
      <div class="bg-white rounded-xl shadow-sm border border-surface-container/30 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low border-b border-outline-variant/30">
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Date & Heure</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Véhicule</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Station</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Type</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              <tr *ngFor="let apt of appointments()" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <p class="text-sm font-bold text-on-surface">{{ apt.appointment_date | date:'dd/MM/yyyy' }}</p>
                  <p class="text-xs text-outline">{{ apt.appointment_date | date:'HH:mm' }}</p>
                </td>
                <td class="px-6 py-4">
                  <p class="text-sm font-bold text-on-surface">{{ apt.vehicle?.brand }} {{ apt.vehicle?.model }}</p>
                  <p class="text-xs text-outline font-mono">{{ apt.vehicle?.license_plate }}</p>
                </td>
                <td class="px-6 py-4 text-sm text-on-surface-variant">
                  {{ apt.station?.name || 'Centre d\\'inspection' }}
                </td>
                <td class="px-6 py-4">
                  <span *ngIf="apt.is_pass_express"
                        class="px-2 py-1 bg-purple-50 text-purple-600 text-[10px] font-black rounded-full uppercase">
                    Express
                  </span>
                  <span *ngIf="!apt.is_pass_express"
                        class="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">
                    Standard
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                        [ngClass]="{
                          'bg-primary-container/20 text-primary': apt.status === 'confirme',
                          'bg-emerald-50 text-emerald-600': apt.status === 'termine',
                          'bg-red-50 text-error': apt.status === 'annule'
                        }">
                    {{ apt.status === 'confirme' ? 'Confirmé' : (apt.status === 'termine' ? 'Terminé' : 'Annulé') }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <button *ngIf="apt.status === 'confirme'"
                          (click)="cancelAppointment(apt)"
                          class="px-3 py-1.5 bg-red-50 text-error text-xs font-bold rounded-lg hover:bg-error hover:text-white transition-all">
                    Annuler
                  </button>
                </td>
              </tr>

              <!-- Loading -->
              <tr *ngIf="loading()">
                <td colspan="6" class="px-6 py-12 text-center">
                  <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                  <p class="text-xs text-outline mt-2">Chargement de vos rendez-vous...</p>
                </td>
              </tr>

              <!-- Empty -->
              <tr *ngIf="!loading() && appointments().length === 0">
                <td colspan="6" class="px-6 py-16 text-center">
                  <span class="material-symbols-outlined text-5xl text-outline/20 block mb-2">event_busy</span>
                  <p class="text-on-surface font-bold text-sm">Aucun rendez-vous</p>
                  <p class="text-outline text-xs mt-1">Cliquez sur "Prendre rendez-vous" pour réserver votre premier créneau.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- MODAL: BOOK APPOINTMENT -->
      <div *ngIf="showBookingModal()" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-in max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-headline font-black text-lg text-on-surface">Réserver un rendez-vous</h3>
            <button (click)="closeBookingModal()" class="text-outline hover:text-on-surface transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="bookingForm" (ngSubmit)="submitBooking()" class="space-y-5">

            <!-- Step 1: Station -->
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Centre d'inspection</label>
              <select formControlName="station_id" (change)="onStationChange()"
                      class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">— Choisissez une station —</option>
                <option *ngFor="let s of stations()" [value]="s.id">{{ s.name }} {{ s.location ? '— ' + s.location : '' }}</option>
              </select>
            </div>

            <!-- Step 2: Date -->
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Date souhaitée</label>
              <input type="date" formControlName="date" (change)="onDateChange()" [min]="minDate"
                     class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
            </div>

            <!-- Step 3: Time Slots -->
            <div *ngIf="availableSlots().length > 0">
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-2">Créneau horaire</label>
              <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <button *ngFor="let slot of availableSlots()" type="button"
                        [disabled]="slot.is_full"
                        (click)="selectSlot(slot)"
                        [class]="selectedSlot()?.time === slot.time
                          ? 'px-3 py-3 bg-primary text-white font-bold text-sm rounded-xl shadow-md shadow-primary/20 transition-all'
                          : slot.is_full
                            ? 'px-3 py-3 bg-slate-100 text-slate-300 font-bold text-sm rounded-xl cursor-not-allowed line-through'
                            : 'px-3 py-3 bg-surface-container text-on-surface font-bold text-sm rounded-xl hover:bg-primary/10 hover:text-primary transition-all cursor-pointer'">
                  {{ slot.time }}
                  <span *ngIf="!slot.is_full" class="block text-[9px] font-normal mt-0.5 opacity-60">{{ slot.available_spots }} place{{ slot.available_spots > 1 ? 's' : '' }}</span>
                  <span *ngIf="slot.is_full" class="block text-[9px] font-normal mt-0.5">Complet</span>
                </button>
              </div>
            </div>

            <div *ngIf="loadingSlots()" class="text-center py-4">
              <span class="material-symbols-outlined animate-spin text-primary">sync</span>
              <p class="text-xs text-outline mt-1">Vérification des disponibilités...</p>
            </div>

            <!-- Step 4: Vehicle -->
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Véhicule à inspecter</label>
              <select formControlName="vehicle_id"
                      class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">— Sélectionnez un véhicule —</option>
                <option *ngFor="let v of vehicles()" [value]="v.id">
                  {{ v.brand }} {{ v.model }} — {{ v.license_plate }}
                </option>
              </select>
            </div>

            <!-- Pass Express -->
            <div class="flex items-center gap-3 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
              <input type="checkbox" formControlName="is_pass_express" id="express"
                     class="w-4 h-4 text-primary rounded focus:ring-primary/20">
              <label for="express" class="text-sm font-bold text-on-surface cursor-pointer">
                Pass Express
                <span class="text-xs text-outline font-normal block mt-0.5">Passage prioritaire sans file d'attente.</span>
              </label>
            </div>

            <div class="pt-4 flex items-center justify-end gap-3">
              <button type="button" (click)="closeBookingModal()"
                      class="px-5 py-2.5 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs rounded-lg transition-colors">
                Annuler
              </button>
              <button type="submit" [disabled]="!canSubmitBooking() || submitting()"
                      class="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
                {{ submitting() ? 'Réservation...' : 'Confirmer le rendez-vous' }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; background: #fbfbfd; min-height: 100vh; }
    .animate-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  `]
})
export class ClientAppointmentsComponent implements OnInit {
  appointments = signal<Appointment[]>([]);
  stations = signal<Station[]>([]);
  vehicles = signal<Vehicle[]>([]);
  availableSlots = signal<TimeSlot[]>([]);
  selectedSlot = signal<TimeSlot | null>(null);
  loading = signal(true);
  loadingSlots = signal(false);
  showBookingModal = signal(false);
  submitting = signal(false);

  bookingForm: FormGroup;
  minDate: string;

  private appointmentService = inject(AppointmentService);
  private stationService = inject(StationService);
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  constructor() {
    // Set min date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    this.bookingForm = this.fb.group({
      station_id: ['', [Validators.required]],
      date: ['', [Validators.required]],
      vehicle_id: ['', [Validators.required]],
      is_pass_express: [false],
    });
  }

  ngOnInit(): void {
    this.loadAppointments();
    this.loadStations();
    this.loadVehicles();
  }

  loadAppointments() {
    this.appointmentService.listAll().subscribe({
      next: (data) => {
        // Sort by date descending (most recent first)
        this.appointments.set(data.sort((a, b) =>
          new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        ));
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Impossible de charger vos rendez-vous.');
        this.loading.set(false);
      }
    });
  }

  loadStations() {
    this.stationService.list().subscribe({
      next: (data) => this.stations.set(data.filter(s => s.is_active)),
      error: () => {}
    });
  }

  loadVehicles() {
    const user = this.authService.getCurrentUser();
    if (user?.company_id) {
      this.vehicleService.getByClient(user.company_id).subscribe({
        next: (data) => this.vehicles.set(data),
        error: () => {}
      });
    }
  }

  countByStatus(status: string): number {
    return this.appointments().filter(a => a.status === status).length;
  }

  cancelAppointment(apt: Appointment) {
    this.appointmentService.cancel(apt.id).subscribe({
      next: () => {
        this.toastService.success('Rendez-vous annulé.');
        this.appointments.update(list =>
          list.map(a => a.id === apt.id ? { ...a, status: 'annule' as const } : a)
        );
      },
      error: () => this.toastService.error('Erreur lors de l\'annulation.')
    });
  }

  openBookingModal() {
    this.bookingForm.reset({
      station_id: '',
      date: '',
      vehicle_id: '',
      is_pass_express: false,
    });
    this.availableSlots.set([]);
    this.selectedSlot.set(null);
    this.showBookingModal.set(true);
  }

  closeBookingModal() {
    this.showBookingModal.set(false);
  }

  onStationChange() {
    this.loadSlotsIfReady();
  }

  onDateChange() {
    this.loadSlotsIfReady();
  }

  private loadSlotsIfReady() {
    const stationId = this.bookingForm.value.station_id;
    const date = this.bookingForm.value.date;
    if (!stationId || !date) return;

    this.loadingSlots.set(true);
    this.availableSlots.set([]);
    this.selectedSlot.set(null);

    this.appointmentService.getSlots(+stationId, date).subscribe({
      next: (slots) => {
        this.availableSlots.set(slots);
        this.loadingSlots.set(false);
      },
      error: () => {
        this.toastService.error('Impossible de charger les créneaux.');
        this.loadingSlots.set(false);
      }
    });
  }

  selectSlot(slot: TimeSlot) {
    if (slot.is_full) return;
    this.selectedSlot.set(slot);
  }

  canSubmitBooking(): boolean {
    return this.bookingForm.valid && this.selectedSlot() !== null;
  }

  submitBooking() {
    if (!this.canSubmitBooking()) return;

    this.submitting.set(true);
    const date = this.bookingForm.value.date;
    const time = this.selectedSlot()!.time;
    const appointmentDate = `${date} ${time}:00`;

    this.appointmentService.book({
      vehicle_id: +this.bookingForm.value.vehicle_id,
      station_id: +this.bookingForm.value.station_id,
      appointment_date: appointmentDate,
      is_pass_express: this.bookingForm.value.is_pass_express || false,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showBookingModal.set(false);
        this.toastService.success('Rendez-vous réservé avec succès !');
        this.loadAppointments();
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err?.error?.message || 'Erreur lors de la réservation.';
        this.toastService.error(msg);
      }
    });
  }
}
