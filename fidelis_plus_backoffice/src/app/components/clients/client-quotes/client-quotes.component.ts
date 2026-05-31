import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { QuoteService, Quote } from '../../../services/quote.service';
import { QuoteRequestService, QuoteRequest } from '../../../services/quote-request.service';
import { VehicleService, Vehicle } from '../../../services/vehicle.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-client-quotes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="animate-fade-in-up space-y-8 pb-20">

      <!-- HEADER -->
      <section class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-headline font-black text-on-surface">Mes Devis</h1>
          <p class="text-outline text-sm font-medium mt-1">Consultez vos devis émis et soumettez de nouvelles demandes.</p>
        </div>
        <button (click)="openRequestModal()"
                class="px-5 py-3 bg-[#15b9a3] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/20 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">request_quote</span>
          Demander un devis
        </button>
      </section>

      <!-- TAB SWITCHER -->
      <section class="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-outline-variant/10 w-fit">
        <button (click)="activeTab.set('quotes')"
                [class]="activeTab() === 'quotes'
                  ? 'px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/20 transition-all'
                  : 'px-5 py-2.5 text-outline font-bold text-xs rounded-lg hover:bg-surface-container transition-all'">
          Devis reçus
        </button>
        <button (click)="activeTab.set('requests')"
                [class]="activeTab() === 'requests'
                  ? 'px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/20 transition-all'
                  : 'px-5 py-2.5 text-outline font-bold text-xs rounded-lg hover:bg-surface-container transition-all'">
          Mes demandes
          <span *ngIf="pendingRequestsCount() > 0"
                class="ml-1.5 bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
            {{ pendingRequestsCount() }}
          </span>
        </button>
      </section>

      <!-- TAB: QUOTES RECEIVED -->
      <div *ngIf="activeTab() === 'quotes'">

        <!-- STATUS SUMMARY -->
        <div class="flex items-center gap-6 text-xs font-bold text-outline mb-6">
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-primary"></span> Acceptés : {{ countQuotesByStatus('accepted') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span> En cours : {{ countQuotesByStatus('sent') + countQuotesByStatus('draft') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-error"></span> Rejetés : {{ countQuotesByStatus('declined') }}</span>
        </div>

        <!-- QUOTES LIST -->
        <div class="bg-white rounded-xl shadow-sm border border-surface-container/30 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low border-b border-outline-variant/30">
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">N° Devis</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Montant</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Validité</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
                  <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10">
                <tr *ngFor="let q of quotes()" class="hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4">
                    <p class="text-sm font-bold text-on-surface">{{ q.quote_number || ('DEV-' + q.id) }}</p>
                  </td>
                  <td class="px-6 py-4 text-sm font-bold text-on-surface">
                    {{ q.total_amount | currency:'XOF':'symbol':'1.0-0' }}
                  </td>
                  <td class="px-6 py-4 text-sm text-outline">
                    {{ q.valid_until ? (q.valid_until | date:'shortDate') : '—' }}
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                          [ngClass]="{
                            'bg-teal-50 text-primary': q.status === 'accepted',
                            'bg-amber-50 text-amber-600': q.status === 'sent' || q.status === 'draft',
                            'bg-red-50 text-error': q.status === 'declined',
                            'bg-slate-100 text-slate-500': q.status === 'expired'
                          }">
                      {{ statusLabel(q.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button *ngIf="q.status === 'sent'"
                            (click)="acceptQuote(q)"
                            class="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-all mr-2">
                      Accepter
                    </button>
                    <button *ngIf="q.status === 'sent'"
                            (click)="declineQuote(q)"
                            class="px-3 py-1.5 bg-red-50 text-error text-xs font-bold rounded-lg hover:bg-error hover:text-white transition-all">
                      Refuser
                    </button>
                  </td>
                </tr>

                <!-- Loading -->
                <tr *ngIf="loadingQuotes()">
                  <td colspan="5" class="px-6 py-12 text-center">
                    <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                    <p class="text-xs text-outline mt-2">Chargement de vos devis...</p>
                  </td>
                </tr>

                <!-- Empty -->
                <tr *ngIf="!loadingQuotes() && quotes().length === 0">
                  <td colspan="5" class="px-6 py-16 text-center">
                    <span class="material-symbols-outlined text-5xl text-outline/20 block mb-2">payments</span>
                    <p class="text-on-surface font-bold text-sm">Aucun devis disponible</p>
                    <p class="text-outline text-xs mt-1">Vos devis apparaîtront ici une fois établis par nos commerciaux.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB: QUOTE REQUESTS -->
      <div *ngIf="activeTab() === 'requests'">
        <div class="space-y-4">
          <div *ngFor="let r of quoteRequests()"
               class="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/10 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/10 transition-colors">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-outline shrink-0">
                <span class="material-symbols-outlined">description</span>
              </div>
              <div>
                <p class="text-sm font-bold text-on-surface">Demande #{{ r.id }}</p>
                <p class="text-xs text-outline mt-0.5">
                  Véhicule : {{ r.vehicle?.brand }} {{ r.vehicle?.model }} — {{ r.vehicle?.license_plate }}
                </p>
                <p class="text-xs text-outline mt-0.5">Soumise le : {{ r.created_at | date:'dd/MM/yyyy à HH:mm' }}</p>
                <p *ngIf="r.notes" class="text-xs text-on-surface-variant mt-1 italic">{{ r.notes }}</p>
              </div>
            </div>
            <span class="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0"
                  [ngClass]="{
                    'bg-amber-50 text-amber-600': r.status === 'pending',
                    'bg-teal-50 text-primary': r.status === 'processed',
                    'bg-red-50 text-error': r.status === 'rejected'
                  }">
              {{ r.status === 'pending' ? 'En attente' : (r.status === 'processed' ? 'Traité' : 'Rejeté') }}
            </span>
          </div>

          <!-- Loading -->
          <div *ngIf="loadingRequests()" class="text-center py-12">
            <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
            <p class="text-xs text-outline mt-2">Chargement de vos demandes...</p>
          </div>

          <!-- Empty -->
          <div *ngIf="!loadingRequests() && quoteRequests().length === 0"
               class="bg-white rounded-xl p-12 text-center border border-outline-variant/10 shadow-sm">
            <span class="material-symbols-outlined text-5xl text-outline/20 block mb-2">inbox</span>
            <p class="text-on-surface font-bold text-sm">Aucune demande de devis</p>
            <p class="text-outline text-xs mt-1">Cliquez sur "Demander un devis" pour soumettre votre première demande.</p>
          </div>
        </div>
      </div>

      <!-- MODAL: NEW QUOTE REQUEST -->
      <div *ngIf="showRequestModal()" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-in">
          <div class="flex justify-between items-center mb-6">
            <h3 class="font-headline font-black text-lg text-on-surface">Nouvelle demande de devis</h3>
            <button (click)="closeRequestModal()" class="text-outline hover:text-on-surface transition-colors">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <form [formGroup]="requestForm" (ngSubmit)="submitRequest()" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Véhicule concerné</label>
              <select formControlName="vehicle_id"
                      class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">— Sélectionnez un véhicule —</option>
                <option *ngFor="let v of vehicles()" [value]="v.id">
                  {{ v.brand }} {{ v.model }} — {{ v.license_plate }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Notes / Commentaires</label>
              <textarea formControlName="notes"
                        rows="3"
                        class="w-full px-4 py-2.5 bg-surface-container rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        placeholder="Décrivez vos besoins (ex: Contrôle technique complet, réparation, etc.)"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Photo carte grise (optionnel)</label>
              <input type="file" accept="image/*" (change)="onFileSelect($event, 'registration')"
                     class="w-full text-sm text-outline file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all">
            </div>

            <div>
              <label class="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">Photo vignette (optionnel)</label>
              <input type="file" accept="image/*" (change)="onFileSelect($event, 'vignette')"
                     class="w-full text-sm text-outline file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all">
            </div>

            <div class="pt-4 flex items-center justify-end gap-3">
              <button type="button" (click)="closeRequestModal()"
                      class="px-5 py-2.5 border border-slate-200 text-outline hover:text-on-surface font-bold text-xs rounded-lg transition-colors">
                Annuler
              </button>
              <button type="submit" [disabled]="requestForm.invalid || submitting()"
                      class="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-lg shadow-md shadow-primary/10 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
                {{ submitting() ? 'Envoi...' : 'Soumettre la demande' }}
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
export class ClientQuotesComponent implements OnInit {
  activeTab = signal<'quotes' | 'requests'>('quotes');
  quotes = signal<Quote[]>([]);
  quoteRequests = signal<QuoteRequest[]>([]);
  vehicles = signal<Vehicle[]>([]);
  loadingQuotes = signal(true);
  loadingRequests = signal(true);
  showRequestModal = signal(false);
  submitting = signal(false);

  requestForm: FormGroup;

  // Files for upload
  private registrationFile: File | null = null;
  private vignetteFile: File | null = null;

  private quoteService = inject(QuoteService);
  private quoteRequestService = inject(QuoteRequestService);
  private vehicleService = inject(VehicleService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  constructor() {
    this.requestForm = this.fb.group({
      vehicle_id: ['', [Validators.required]],
      notes: [''],
    });
  }

  pendingRequestsCount = computed(() =>
    this.quoteRequests().filter(r => r.status === 'pending').length
  );

  ngOnInit(): void {
    this.loadQuotes();
    this.loadRequests();
    this.loadVehicles();
  }

  loadQuotes() {
    const user = this.authService.getCurrentUser();
    const companyId = user?.company_id;
    this.quoteService.getPage({ company_id: companyId ?? undefined, per_page: 100 }).subscribe({
      next: (res) => {
        this.quotes.set(res.data);
        this.loadingQuotes.set(false);
      },
      error: () => {
        this.toastService.error('Impossible de charger vos devis.');
        this.loadingQuotes.set(false);
      }
    });
  }

  loadRequests() {
    this.quoteRequestService.getPending().subscribe({
      next: (data) => {
        // getPending filters by 'pending' only, but we want all requests for client
        this.quoteRequests.set(data);
        this.loadingRequests.set(false);
      },
      error: () => {
        this.toastService.error('Impossible de charger vos demandes.');
        this.loadingRequests.set(false);
      }
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

  countQuotesByStatus(status: string): number {
    return this.quotes().filter(q => q.status === status).length;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'accepted': return 'Accepté';
      case 'sent': return 'Envoyé';
      case 'draft': return 'Brouillon';
      case 'declined': return 'Refusé';
      case 'expired': return 'Expiré';
      default: return status;
    }
  }

  acceptQuote(quote: Quote) {
    if (!quote.id) return;
    this.quoteService.updateStatus(quote.id, 'accepted').subscribe({
      next: () => {
        this.toastService.success('Devis accepté avec succès.');
        this.quotes.update(list => list.map(q => q.id === quote.id ? { ...q, status: 'accepted' as const } : q));
      },
      error: () => this.toastService.error('Erreur lors de l\'acceptation.')
    });
  }

  declineQuote(quote: Quote) {
    if (!quote.id) return;
    this.quoteService.updateStatus(quote.id, 'declined').subscribe({
      next: () => {
        this.toastService.success('Devis refusé.');
        this.quotes.update(list => list.map(q => q.id === quote.id ? { ...q, status: 'declined' as const } : q));
      },
      error: () => this.toastService.error('Erreur lors du refus.')
    });
  }

  openRequestModal() {
    this.requestForm.reset({ vehicle_id: '', notes: '' });
    this.registrationFile = null;
    this.vignetteFile = null;
    this.showRequestModal.set(true);
  }

  closeRequestModal() {
    this.showRequestModal.set(false);
  }

  onFileSelect(event: Event, type: 'registration' | 'vignette') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (type === 'registration') this.registrationFile = file || null;
    else this.vignetteFile = file || null;
  }

  submitRequest() {
    if (this.requestForm.invalid) return;

    this.submitting.set(true);
    const formData = new FormData();
    formData.append('vehicle_id', this.requestForm.value.vehicle_id);
    if (this.requestForm.value.notes) {
      formData.append('notes', this.requestForm.value.notes);
    }
    if (this.registrationFile) {
      formData.append('registration_image', this.registrationFile);
    }
    if (this.vignetteFile) {
      formData.append('vignette_image', this.vignetteFile);
    }

    // Use HttpClient directly for FormData upload
    const apiUrl = `${environment.apiUrl}/api/v1/quote-requests`;

    this.http.post<any>(apiUrl, formData).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.showRequestModal.set(false);
        this.toastService.success('Demande de devis envoyée avec succès !');
        this.loadRequests();
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('Error submitting quote request', err);
        this.toastService.error('Erreur lors de l\'envoi de votre demande.');
      }
    });
  }
}
