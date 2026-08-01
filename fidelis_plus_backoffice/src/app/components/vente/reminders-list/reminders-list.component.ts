import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TechnicalVisitReminderService,
  TechnicalVisitReminderRow,
  ReminderStatus,
  PaginatedMeta,
} from '../../../services/technical-visit-reminder.service';
import { ToastService } from '../../../services/toast.service';
import { openRemindersPdfExport } from '../../../utils/reminders-pdf-export';

@Component({
  selector: 'app-reminders-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 animate-fade-in pb-20">

      <!-- HEADER -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-headline font-black text-on-surface tracking-tighter">
            Rappels <span class="text-primary">Visite Technique</span>
          </h1>
          <p class="text-outline text-sm font-medium mt-1">
            Leads générés via les formulaires QR en station — à traiter en priorité.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Compteur total -->
          <div class="flex items-center gap-2 px-5 py-3 bg-primary/10 rounded-2xl border border-primary/20">
            <span class="material-symbols-outlined text-primary text-xl">qr_code_scanner</span>
            <span class="text-primary font-black text-lg">{{ meta()?.total ?? 0 }}</span>
            <span class="text-primary/70 text-xs font-bold uppercase tracking-widest">formulaires reçus</span>
          </div>
          <button type="button" (click)="exportPdf()" [disabled]="exportingPdf()"
            class="flex items-center gap-2 px-5 py-3 bg-white border border-outline-variant/30 text-on-surface font-bold text-sm rounded-2xl hover:bg-surface-container transition-all disabled:opacity-50">
            <span class="material-symbols-outlined text-lg" [class.animate-spin]="exportingPdf()">{{ exportingPdf() ? 'sync' : 'picture_as_pdf' }}</span>
            Exporter PDF
          </button>
        </div>
      </section>

      <!-- FILTRES -->
      <div class="flex flex-wrap items-end gap-3">
        <button *ngFor="let f of filters"
          (click)="setFilter(f.value)"
          [class.bg-primary]="filterStatus() === f.value"
          [class.text-white]="filterStatus() === f.value"
          [class.bg-surface-container]="filterStatus() !== f.value"
          [class.text-outline]="filterStatus() !== f.value"
          class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          {{ f.label }}
        </button>

        <!-- BASCULE VUE LISTE / CARTES -->
        <div class="flex items-center gap-1 bg-surface-container rounded-xl p-1">
          <button type="button" (click)="viewMode.set('cards')" title="Vue cartes"
            [class]="'w-9 h-9 rounded-lg flex items-center justify-center transition-all ' + (viewMode() === 'cards' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
            <span class="material-symbols-outlined text-lg">grid_view</span>
          </button>
          <button type="button" (click)="viewMode.set('list')" title="Vue liste"
            [class]="'w-9 h-9 rounded-lg flex items-center justify-center transition-all ' + (viewMode() === 'list' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
            <span class="material-symbols-outlined text-lg">view_list</span>
          </button>
        </div>

        <!-- FILTRE PAR DATE DE VISITE TECHNIQUE -->
        <div class="flex items-end gap-2 ml-auto">
          <div>
            <label class="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Visite du</label>
            <input type="date" [(ngModel)]="visitDateFrom" (change)="onDateFilterChange()"
              class="px-3 py-2 rounded-xl border border-outline-variant/20 bg-surface-container text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="block text-[10px] font-black uppercase tracking-widest text-outline mb-1">Au</label>
            <input type="date" [(ngModel)]="visitDateTo" (change)="onDateFilterChange()"
              class="px-3 py-2 rounded-xl border border-outline-variant/20 bg-surface-container text-xs font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button *ngIf="visitDateFrom || visitDateTo" (click)="clearDateFilter()"
            class="px-3 py-2 rounded-xl text-xs font-bold text-outline hover:bg-surface-container transition-all">
            Réinitialiser
          </button>
        </div>
      </div>

      <!-- LOADING -->
      <div *ngIf="loading()" class="text-center py-16 text-outline animate-pulse">
        <span class="material-symbols-outlined text-5xl">hourglass_top</span>
        <p class="mt-2 text-sm font-bold">Chargement...</p>
      </div>

      <!-- LISTE VIDE -->
      <div *ngIf="!loading() && reminders().length === 0" class="text-center py-20">
        <span class="material-symbols-outlined text-6xl text-outline/30">inbox</span>
        <p class="text-outline text-sm font-bold mt-3">Aucun rappel pour ce filtre.</p>
      </div>

      <!-- LISTE (tableau compact) -->
      <div *ngIf="!loading() && reminders().length > 0 && viewMode() === 'list'" class="bg-white rounded-[1.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container border-b border-outline-variant/10">
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest">Contact</th>
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest">Méthode</th>
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest">Station</th>
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest text-center">Véhicules</th>
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest">Alerte</th>
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest">Reçu le</th>
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest">Statut</th>
                <th class="px-5 py-3 text-[10px] font-black text-outline uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              <tr *ngFor="let r of reminders()" class="hover:bg-surface-container-low/60 transition-colors">
                <td class="px-5 py-4">
                  <p class="font-black text-on-surface text-sm">{{ r.full_name }}</p>
                  <p class="text-xs text-outline">{{ r.contact }}</p>
                </td>
                <td class="px-5 py-4">
                  <span class="flex items-center gap-1.5 text-xs font-semibold text-on-surface capitalize">
                    <span class="material-symbols-outlined text-sm text-outline">{{ methodIcon(r.contact_method) }}</span>
                    {{ r.contact_method }}
                  </span>
                </td>
                <td class="px-5 py-4 text-xs font-semibold text-outline">{{ r.station?.name || '—' }}</td>
                <td class="px-5 py-4 text-center">
                  <span class="px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-bold">{{ r.vehicles.length }}</span>
                </td>
                <td class="px-5 py-4 text-xs font-semibold text-outline">{{ alertPeriodLabel(r.alert_period) }}</td>
                <td class="px-5 py-4 text-xs font-semibold text-outline">{{ r.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="px-5 py-4">
                  <span [class]="statusClass(r.status)" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {{ statusLabel(r.status) }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <button *ngIf="r.status === 'pending'" (click)="startEdit(r)" title="Marquer contacté"
                      class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                      <span class="material-symbols-outlined text-lg">phone_in_talk</span>
                    </button>
                    <button *ngIf="r.status === 'contacted'" (click)="markDone(r)" title="Marquer terminé" [disabled]="savingId() === r.id"
                      class="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center hover:bg-secondary hover:text-white transition-all disabled:opacity-50">
                      <span class="material-symbols-outlined text-lg">check_circle</span>
                    </button>
                    <button (click)="startEdit(r)" title="Modifier"
                      class="w-9 h-9 rounded-xl bg-surface-container-low text-outline flex items-center justify-center hover:bg-surface-container transition-all">
                      <span class="material-symbols-outlined text-lg">edit_note</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ÉDITION INLINE (statut + notes) -->
        <div *ngIf="editingId() && listEditTarget() as r" class="p-6 border-t border-outline-variant/10 bg-surface-container-low/40">
          <p class="text-xs font-black uppercase tracking-widest text-outline mb-3">Modifier — {{ r.full_name }}</p>
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="sm:w-48">
              <label class="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Statut</label>
              <select [(ngModel)]="editStatus"
                class="w-full px-3 py-2 rounded-xl border border-outline-variant/20 bg-white text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="pending">En attente</option>
                <option value="contacted">Contacté</option>
                <option value="done">Terminé</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Notes internes</label>
              <textarea [(ngModel)]="editNotes" rows="2"
                placeholder="Résumé de l'appel, accord du client, RDV pris..."
                class="w-full px-3 py-2 rounded-xl border border-outline-variant/20 bg-white text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"></textarea>
            </div>
            <div class="flex sm:flex-col gap-2 sm:justify-end">
              <button (click)="saveEdit(r.id)" [disabled]="savingId() === r.id"
                class="flex-1 sm:flex-none bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
                {{ savingId() === r.id ? '...' : 'Enregistrer' }}
              </button>
              <button (click)="cancelEdit()"
                class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-outline-variant/20 text-outline hover:bg-white transition-all">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CARDS -->
      <div *ngIf="!loading() && viewMode() === 'cards'" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div *ngFor="let r of reminders()"
          class="bg-white rounded-[1.5rem] border border-outline-variant/10 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">

          <!-- TOP ROW -->
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-black text-on-surface text-base">{{ r.full_name }}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="material-symbols-outlined text-sm text-outline">{{ methodIcon(r.contact_method) }}</span>
                <span class="text-xs text-outline font-medium">{{ r.contact }}</span>
              </div>
            </div>
            <!-- STATUS BADGE -->
            <span [class]="statusClass(r.status)" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0">
              {{ statusLabel(r.status) }}
            </span>
          </div>

          <!-- INFOS -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-surface-container rounded-xl p-3">
              <p class="text-outline/60 font-bold uppercase tracking-wider mb-0.5">Méthode contact</p>
              <p class="font-black text-on-surface capitalize">{{ r.contact_method }}</p>
            </div>
            <div class="bg-surface-container rounded-xl p-3">
              <p class="text-outline/60 font-bold uppercase tracking-wider mb-0.5">Alerte</p>
              <p class="font-black text-on-surface">{{ alertPeriodLabel(r.alert_period) }}</p>
            </div>
            <div class="bg-surface-container rounded-xl p-3" *ngIf="r.station">
              <p class="text-outline/60 font-bold uppercase tracking-wider mb-0.5">Station</p>
              <p class="font-black text-on-surface">{{ r.station.name }}</p>
            </div>
            <div class="bg-surface-container rounded-xl p-3">
              <p class="text-outline/60 font-bold uppercase tracking-wider mb-0.5">Reçu le</p>
              <p class="font-black text-on-surface">{{ r.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
            </div>
          </div>

          <!-- VEHICULES -->
          <div class="bg-surface-container rounded-xl p-3">
            <p class="text-outline/60 font-bold uppercase tracking-wider text-[10px] mb-2">Véhicules ({{ r.vehicles.length }})</p>
            <div *ngFor="let v of r.vehicles" class="flex items-center justify-between py-1 border-b border-outline-variant/5 last:border-0">
              <span class="font-black text-xs text-on-surface font-mono">{{ v.registration }}</span>
              <span class="text-[10px] text-outline font-medium">
                Exp. : {{ v.visit_expiration_date | date:'dd/MM/yyyy' }}
              </span>
            </div>
          </div>

          <!-- NOTES -->
          <div *ngIf="editingId() !== r.id">
            <div *ngIf="r.notes" class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium italic">
              "{{ r.notes }}"
            </div>
            <div *ngIf="r.handler" class="text-[10px] text-outline mt-2">
              Traité par : {{ r.handler.first_name }} {{ r.handler.last_name }}
            </div>
          </div>

          <!-- ACTIONS -->
          <div *ngIf="editingId() !== r.id" class="flex flex-wrap gap-2 pt-2 border-t border-outline-variant/10">
            <button *ngIf="r.status === 'pending'" (click)="startEdit(r)"
              class="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
              <span class="material-symbols-outlined text-sm">phone_in_talk</span> Marquer contacté
            </button>
            <button *ngIf="r.status === 'contacted'" (click)="markDone(r)"
              class="flex-1 flex items-center justify-center gap-1.5 bg-secondary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-secondary/90 transition-all"
              [disabled]="savingId() === r.id">
              <span class="material-symbols-outlined text-sm">check_circle</span> Marquer terminé
            </button>
            <button (click)="startEdit(r)"
              class="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-outline-variant/20 text-outline hover:bg-surface-container transition-all">
              <span class="material-symbols-outlined text-sm">edit_note</span>
            </button>
          </div>

          <!-- FORM EDITION (notes + statut) -->
          <div *ngIf="editingId() === r.id" class="flex flex-col gap-3 pt-2 border-t border-outline-variant/10">
            <div>
              <label class="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Statut</label>
              <select [(ngModel)]="editStatus"
                class="w-full px-3 py-2 rounded-xl border border-outline-variant/20 bg-surface-container text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="pending">En attente</option>
                <option value="contacted">Contacté</option>
                <option value="done">Terminé</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-black uppercase tracking-widest text-outline mb-1 block">Notes internes</label>
              <textarea [(ngModel)]="editNotes" rows="3"
                placeholder="Résumé de l'appel, accord du client, RDV pris..."
                class="w-full px-3 py-2 rounded-xl border border-outline-variant/20 bg-surface-container text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"></textarea>
            </div>
            <div class="flex gap-2">
              <button (click)="saveEdit(r.id)"
                [disabled]="savingId() === r.id"
                class="flex-1 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
                {{ savingId() === r.id ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button (click)="cancelEdit()"
                class="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-outline-variant/20 text-outline hover:bg-surface-container transition-all">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PAGINATION -->
      <div *ngIf="meta() && (meta()?.last_page ?? 1) > 1" class="flex justify-center gap-2 pt-4">
        <button (click)="prevPage()" [disabled]="currentPage() <= 1"
          class="px-4 py-2 rounded-xl text-sm font-bold border border-outline-variant/20 text-outline hover:bg-surface-container disabled:opacity-30 transition-all">
          ‹ Précédent
        </button>
        <span class="px-4 py-2 text-sm text-outline font-semibold">
          Page {{ currentPage() }} / {{ meta()?.last_page }}
        </span>
        <button (click)="nextPage()" [disabled]="currentPage() >= (meta()?.last_page ?? 1)"
          class="px-4 py-2 rounded-xl text-sm font-bold border border-outline-variant/20 text-outline hover:bg-surface-container disabled:opacity-30 transition-all">
          Suivant ›
        </button>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in {
      animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class RemindersListComponent implements OnInit {
  private service = inject(TechnicalVisitReminderService);
  private toast = inject(ToastService);

  reminders = signal<TechnicalVisitReminderRow[]>([]);
  meta = signal<PaginatedMeta | null>(null);
  loading = signal(false);
  filterStatus = signal<string>('');
  currentPage = signal(1);
  viewMode = signal<'cards' | 'list'>('cards');
  visitDateFrom = '';
  visitDateTo = '';
  exportingPdf = signal(false);

  editingId = signal<number | null>(null);
  editStatus: ReminderStatus = 'pending';
  editNotes = '';
  savingId = signal<number | null>(null);

  filters = [
    { label: 'Tous', value: '' },
    { label: 'En attente', value: 'pending' },
    { label: 'Contacté', value: 'contacted' },
    { label: 'Terminé', value: 'done' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list(
      this.filterStatus() || undefined,
      this.currentPage(),
      20,
      this.visitDateFrom || undefined,
      this.visitDateTo || undefined,
    ).subscribe({
      next: ({ items, meta }) => {
        this.reminders.set(items);
        this.meta.set(meta);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Impossible de charger les rappels.');
        this.loading.set(false);
      },
    });
  }

  setFilter(value: string): void {
    this.filterStatus.set(value);
    this.currentPage.set(1);
    this.load();
  }

  onDateFilterChange(): void {
    this.currentPage.set(1);
    this.load();
  }

  clearDateFilter(): void {
    this.visitDateFrom = '';
    this.visitDateTo = '';
    this.currentPage.set(1);
    this.load();
  }

  /** Exporte en PDF imprimable l'ensemble des rappels correspondant aux filtres actifs (pas seulement la page courante). */
  exportPdf(): void {
    this.exportingPdf.set(true);
    this.service.list(
      this.filterStatus() || undefined,
      1,
      1000,
      this.visitDateFrom || undefined,
      this.visitDateTo || undefined,
    ).subscribe({
      next: ({ items }) => {
        this.exportingPdf.set(false);
        openRemindersPdfExport(items, {
          status: this.filterStatus() || undefined,
          visitDateFrom: this.visitDateFrom || undefined,
          visitDateTo: this.visitDateTo || undefined,
        });
      },
      error: () => {
        this.exportingPdf.set(false);
        this.toast.error("Impossible de générer l'export PDF.");
      },
    });
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    const meta = this.meta();
    if (meta && this.currentPage() < meta.last_page) {
      this.currentPage.update(p => p + 1);
      this.load();
    }
  }

  startEdit(r: TechnicalVisitReminderRow): void {
    this.editingId.set(r.id);
    this.editStatus = r.status;
    this.editNotes = r.notes ?? '';
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  /** Rappel en cours d'édition, pour le panneau d'édition inline de la vue liste. */
  listEditTarget(): TechnicalVisitReminderRow | null {
    const id = this.editingId();
    return id ? (this.reminders().find(r => r.id === id) ?? null) : null;
  }

  saveEdit(id: number): void {
    this.savingId.set(id);
    this.service.update(id, { status: this.editStatus, notes: this.editNotes }).subscribe({
      next: (updated) => {
        this.reminders.update(list =>
          list.map(r => r.id === id ? { ...r, ...updated } : r)
        );
        this.editingId.set(null);
        this.savingId.set(null);
        this.toast.success('Rappel mis à jour avec succès.');
      },
      error: () => {
        this.toast.error('Erreur lors de la mise à jour.');
        this.savingId.set(null);
      },
    });
  }

  markDone(r: TechnicalVisitReminderRow): void {
    this.savingId.set(r.id);
    this.service.update(r.id, { status: 'done' }).subscribe({
      next: (updated) => {
        this.reminders.update(list =>
          list.map(item => item.id === r.id ? { ...item, ...updated } : item)
        );
        this.savingId.set(null);
        this.toast.success('Rappel marqué comme terminé.');
      },
      error: () => {
        this.toast.error('Erreur lors de la mise à jour.');
        this.savingId.set(null);
      },
    });
  }

  statusLabel(s: ReminderStatus): string {
    return { pending: 'En attente', contacted: 'Contacté', done: 'Terminé' }[s] ?? s;
  }

  statusClass(s: ReminderStatus): string {
    return {
      pending: 'bg-amber-100 text-amber-700',
      contacted: 'bg-blue-100 text-blue-700',
      done: 'bg-green-100 text-green-700',
    }[s] ?? 'bg-surface-container text-outline';
  }

  methodIcon(m: string): string {
    return { appel: 'phone', sms: 'sms', whatsapp: 'chat' }[m] ?? 'contacts';
  }

  alertPeriodLabel(p: string): string {
    return { '2_semaines': '2 semaines avant', '1_semaine': '1 semaine avant', veille: 'La veille' }[p] ?? p;
  }
}
