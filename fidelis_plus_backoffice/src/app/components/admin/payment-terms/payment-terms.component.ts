import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentTermService, PaymentTerm } from '../../../services/payment-term.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-payment-terms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto px-6 py-10 animate-fade-in space-y-8">
      <header class="flex items-center justify-between gap-6">
        <div>
          <h1 class="text-3xl font-headline font-black text-on-surface tracking-tight">Conditions de paiement</h1>
          <p class="text-sm text-outline font-medium mt-1">Choix proposés lors de la création d'un devis.</p>
        </div>
        <button (click)="openForm()"
          class="h-12 px-6 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
          <span class="material-symbols-outlined">add_circle</span>
          Ajouter
        </button>
      </header>

      <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div *ngIf="loading()" class="p-16 text-center text-outline">
          <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
        </div>

        <div *ngIf="!loading()" class="divide-y divide-outline-variant/10">
          <div *ngFor="let t of terms()" class="px-6 py-4 flex items-center justify-between gap-4" [class.opacity-50]="!t.is_active">
            <div class="min-w-0">
              <p class="font-bold text-on-surface truncate">{{ t.label }}</p>
              <p *ngIf="t.description" class="text-xs text-outline mt-0.5">{{ t.description }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                    [class]="t.is_active ? 'bg-secondary/10 text-secondary' : 'bg-outline/10 text-outline'">
                {{ t.is_active ? 'Active' : 'Inactive' }}
              </span>
              <button (click)="toggleActive(t)" class="p-2 text-outline hover:bg-surface-container-low rounded-lg transition-colors" title="Activer/désactiver">
                <span class="material-symbols-outlined text-sm">{{ t.is_active ? 'toggle_on' : 'toggle_off' }}</span>
              </button>
              <button (click)="openForm(t)" class="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Modifier">
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
              <button (click)="deleteTerm(t)" class="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="Supprimer">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
          <div *ngIf="terms().length === 0" class="p-12 text-center text-outline text-sm italic font-medium">Aucune condition de paiement configurée.</div>
        </div>
      </div>

      <!-- Modal formulaire -->
      <div *ngIf="showModal()" class="fixed inset-0 z-[60] overflow-y-auto flex items-start justify-center p-6 py-10 animate-fade-in">
        <div class="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" (click)="closeModal()"></div>
        <div class="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden p-8 space-y-6">
          <header>
            <h3 class="text-xl font-headline font-black text-on-surface">{{ editingId ? 'Modifier' : 'Nouvelle' }} condition</h3>
          </header>

          <div class="space-y-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-outline ml-1">Libellé *</label>
              <input type="text" [(ngModel)]="formTerm.label" placeholder="Ex: 30 jours"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            </div>
            <div class="space-y-1.5">
              <label class="text-[10px] font-black uppercase text-outline ml-1">Description (facultatif)</label>
              <input type="text" [(ngModel)]="formTerm.description" placeholder="Précision affichée en info-bulle"
                     class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-outline-variant/10 font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            </div>
            <div class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low/50 border border-outline-variant/5">
              <input type="checkbox" id="is_active" [(ngModel)]="formTerm.is_active" class="w-5 h-5 accent-secondary">
              <label for="is_active" class="text-xs font-bold text-on-surface select-none">Active (proposée à la création d'un devis)</label>
            </div>
          </div>

          <div class="flex items-center gap-4 pt-2">
            <button (click)="closeModal()" class="flex-1 h-12 rounded-xl border border-outline-variant/20 text-xs font-black uppercase tracking-widest hover:bg-surface-container-low transition-all">Annuler</button>
            <button (click)="save()" [disabled]="!formTerm.label || submitting()"
                    class="flex-1 h-12 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-sm" *ngIf="!submitting()">save</span>
              <span class="material-symbols-outlined animate-spin text-sm" *ngIf="submitting()">sync</span>
              {{ submitting() ? '...' : 'Valider' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class PaymentTermsComponent implements OnInit {
  private paymentTermService = inject(PaymentTermService);
  private toastService = inject(ToastService);

  terms = signal<PaymentTerm[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showModal = signal(false);

  editingId: number | null = null;
  formTerm: Partial<PaymentTerm> = { label: '', description: '', is_active: true };

  ngOnInit(): void {
    this.loadTerms();
  }

  loadTerms(): void {
    this.loading.set(true);
    this.paymentTermService.list(true).subscribe({
      next: (data) => { this.terms.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toastService.error('Impossible de charger les conditions de paiement.'); },
    });
  }

  openForm(t?: PaymentTerm): void {
    if (t) {
      this.editingId = t.id;
      this.formTerm = { ...t };
    } else {
      this.editingId = null;
      this.formTerm = { label: '', description: '', is_active: true };
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  save(): void {
    this.submitting.set(true);
    const obs = this.editingId
      ? this.paymentTermService.update(this.editingId, this.formTerm)
      : this.paymentTermService.create(this.formTerm);

    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.toastService.success(this.editingId ? 'Condition mise à jour.' : 'Condition créée.');
        this.closeModal();
        this.loadTerms();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toastService.error(err.error?.message || "Erreur lors de l'enregistrement.");
      },
    });
  }

  toggleActive(t: PaymentTerm): void {
    this.paymentTermService.update(t.id, { is_active: !t.is_active }).subscribe({
      next: () => this.loadTerms(),
      error: () => this.toastService.error('Action impossible.'),
    });
  }

  deleteTerm(t: PaymentTerm): void {
    if (!confirm(`Supprimer la condition "${t.label}" ?`)) return;
    this.paymentTermService.delete(t.id).subscribe({
      next: () => {
        this.toastService.success('Condition de paiement supprimée.');
        this.loadTerms();
      },
      error: (err) => this.toastService.error(err.error?.message || 'Action impossible.'),
    });
  }
}
