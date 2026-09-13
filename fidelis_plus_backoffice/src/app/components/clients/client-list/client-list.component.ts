import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccountService, ClientListMeta } from '../../../services/account.service';
import { ToastService } from '../../../services/toast.service';
import { downloadCsv } from '../../../utils/csv-download';
import { openReportPreviewWindow } from '../../../utils/report-preview-window';
import { LayoutService } from '../../../services/layout.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="animate-fade-in-up">
      <!-- Filter Bar -->
      <section class="mb-8 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4 flex flex-wrap items-center gap-4 border border-surface-container/30">
        <div class="flex-1 min-w-[220px]">
          <label for="search-clients" class="sr-only">Rechercher un client</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]" aria-hidden="true">search</span>
            <input id="search-clients" type="text" [(ngModel)]="searchQuery"
                   (ngModelChange)="onSearchChange($event)"
                   placeholder="Rechercher par entreprise, contact, email, secteur..."
                   class="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20">
          </div>
        </div>
        <div class="min-w-[140px]">
          <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" class="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium outline-none">
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        <div class="min-w-[150px]">
          <select [(ngModel)]="sourceFilter" (ngModelChange)="onFilterChange()" class="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium outline-none">
            <option value="all">Toutes sources</option>
            <option value="odoo">Via Odoo</option>
            <option value="fidelis">FidelisPlus direct</option>
          </select>
        </div>
        <div class="min-w-[80px]">
          <select [(ngModel)]="perPage" (ngModelChange)="onPerPageChange()" class="w-full px-3 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium outline-none">
            <option [ngValue]="10">10</option>
            <option [ngValue]="15">15</option>
            <option [ngValue]="25">25</option>
            <option [ngValue]="50">50</option>
          </select>
        </div>
        <div class="flex items-center gap-3 ml-auto">
          <button type="button" (click)="exportClientsCsv()" class="px-5 py-2 border-2 border-outline-variant text-on-surface font-bold text-sm rounded-xl hover:bg-surface-container transition-colors flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">download</span>
            Exporter
          </button>
          <button routerLink="/clients/nouveau" class="px-5 py-2 bg-[#15b9a3] hover:brightness-110 text-white font-bold text-sm rounded-xl shadow-lg shadow-[#15b9a3]/20 active:scale-95 transition-all flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px]">person_add</span>
            Nouveau client
          </button>
        </div>
      </section>

      <!-- Stats Overview -->
      <div class="grid grid-cols-12 gap-6 mb-8">
        <div class="col-span-12 lg:col-span-8 bg-gradient-to-br from-[#1a1831] to-[#2a2745] p-6 rounded-xl text-white relative overflow-hidden shadow-sm">
          <div class="relative z-10">
            <h2 class="text-2xl font-headline font-extrabold mb-1">Portefeuille Clients</h2>
            <p class="text-white/60 text-sm mb-6">Performance de rétention et croissance mensuelle.</p>
            <div class="flex flex-wrap gap-12">
              <div>
                <p class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Total</p>
                <p class="text-3xl font-headline font-extrabold text-[#15b9a3]">{{ meta()?.total ?? 0 }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Page {{ meta()?.current_page ?? 1 }} / {{ meta()?.last_page ?? 1 }}</p>
                <p class="text-3xl font-headline font-extrabold">{{ clients().length }}</p>
              </div>
            </div>
          </div>
          <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl"></div>
          <div class="absolute right-12 top-6">
            <span class="material-symbols-outlined text-white/10 text-[120px]">analytics</span>
          </div>
        </div>
        <div class="col-span-12 lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-surface-container/30 border-l-4 border-l-secondary">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-outline uppercase tracking-wider">Alerte Inactivité</h3>
            <span class="material-symbols-outlined text-secondary">trending_down</span>
          </div>
          <p class="text-3xl font-headline font-extrabold text-on-background mb-1">{{ inactiveSixMonthsCount() }}</p>
          <p class="text-xs text-outline">Clients sans contact depuis 6+ mois</p>
        </div>
      </div>

      <!-- Main Data Table -->
      <div class="bg-white rounded-xl shadow-sm border border-surface-container/30 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low border-b border-outline-variant/30">
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Nom entreprise</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Correspondant</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest text-center">Flotte</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Secteur</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Provenance</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Date création</th>
                <th class="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-widest">Statut</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/10">
              <tr *ngFor="let c of clients()" [routerLink]="['/clients', c.id]" class="hover:bg-surface-container-low/50 transition-colors group cursor-pointer">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface font-bold">
                      {{ c.name.substring(0, 2).toUpperCase() }}
                    </div>
                    <div>
                      <p class="text-sm font-bold text-on-surface">{{ c.name }}</p>
                      <p class="text-xs text-outline">ID: CLI-{{ c.id * 1000 }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div>
                    <p class="text-sm font-semibold text-on-surface">
                      <ng-container *ngIf="c.contacts && c.contacts.length > 0; else noContact">
                        {{ c.contacts[0].first_name }} {{ c.contacts[0].last_name }}
                      </ng-container>
                      <ng-template #noContact><span class="text-xs text-outline italic">Aucun contact</span></ng-template>
                    </p>
                    <p class="text-xs text-outline mt-0.5">{{ c.contacts?.[0]?.phone ? c.contacts[0].phone : (c.phone || '—') }}</p>
                    <p class="text-xs text-outline mt-0.5">{{ c.email || '—' }}</p>
                  </div>
                </td>
                <td class="px-6 py-4 text-center">
                  <span class="px-2.5 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-bold">{{ c.vehicles_count ?? 0 }}</span>
                </td>
                <td class="px-6 py-4 text-sm text-outline">{{ c.sector || '—' }}</td>
                <td class="px-6 py-4">
                  <span *ngIf="c.created_via_odoo" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#714B67]/10 text-[#714B67]">Odoo</span>
                  <span *ngIf="!c.created_via_odoo" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">FidelisPlus</span>
                </td>
                <td class="px-6 py-4">
                  <span class="text-xs font-semibold text-on-surface">
                    {{ c.created_at | date:'dd/MM/yyyy' }}
                  </span>
                  <p class="text-[10px] text-outline mt-0.5">{{ c.created_at | date:'HH:mm' }}</p>
                </td>
                <td class="px-6 py-4">
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                        [ngClass]="c.is_active ? 'bg-primary-container/20 text-primary' : 'bg-slate-100 text-slate-500'">
                    {{ c.is_active ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
              </tr>

              <!-- Loading -->
              <tr *ngIf="loading()">
                <td colspan="7" class="px-6 py-16 text-center">
                  <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                  <p class="text-outline font-medium mt-2">Chargement des clients...</p>
                </td>
              </tr>
              <!-- Error -->
              <tr *ngIf="!loading() && error()">
                <td colspan="7" class="px-6 py-20 text-center">
                  <span class="material-symbols-outlined text-6xl text-error/40 block mb-3">cloud_off</span>
                  <p class="text-on-surface font-bold text-lg mb-1">Impossible de charger les clients</p>
                  <p class="text-outline text-sm mb-6">Une erreur réseau est survenue. Vérifiez votre connexion et réessayez.</p>
                  <button (click)="loadClients()" class="px-6 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all inline-flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">refresh</span>
                    Réessayer
                  </button>
                </td>
              </tr>
              <!-- Empty -->
              <tr *ngIf="!loading() && !error() && clients().length === 0">
                <td colspan="7" class="px-6 py-20 text-center">
                  <span class="material-symbols-outlined text-6xl text-outline/30 block mb-3">group_off</span>
                  <p class="text-on-surface font-bold text-lg mb-1">Aucun client trouvé</p>
                  <p class="text-outline text-sm mb-6">Convertissez un prospect chaud ou créez un client directement.</p>
                  <button routerLink="/clients/nouveau" class="px-6 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all inline-flex items-center gap-2">
                    <span class="material-symbols-outlined text-sm">person_add</span>
                    Créer un client
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="meta() && (meta()?.last_page ?? 1) > 1" class="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10">
          <span class="text-xs font-semibold text-outline">
            Page {{ meta()?.current_page ?? 1 }} / {{ meta()?.last_page ?? 1 }} — {{ meta()?.total ?? 0 }} client(s)
          </span>
          <div class="flex gap-2">
            <button type="button" (click)="goPage(-1)"
                    [disabled]="loading() || (meta()?.current_page ?? 1) <= 1"
                    class="px-4 py-1.5 rounded-xl bg-white border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-surface-container transition-all">
              Précédent
            </button>
            <button type="button" (click)="goPage(1)"
                    [disabled]="loading() || (meta()?.current_page ?? 1) >= (meta()?.last_page ?? 1)"
                    class="px-4 py-1.5 rounded-xl bg-white border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-surface-container transition-all">
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClientListComponent implements OnInit, OnDestroy {
  clients = signal<any[]>([]);
  meta = signal<ClientListMeta | null>(null);
  loading = signal(true);
  error = signal(false);

  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  sourceFilter = signal<'all' | 'odoo' | 'fidelis'>('all');
  searchQuery = signal('');
  page = signal(1);
  perPage = signal(15);

  private accountService = inject(AccountService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);
  private syncSub?: Subscription;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  inactiveSixMonthsCount = computed(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    return this.clients().filter((c: any) => {
      const lastContact = c.last_contact || c.created_at;
      if (!lastContact) return true;
      return new Date(lastContact) < cutoff;
    }).length;
  });

  onSearchChange(val: string): void {
    this.searchSubject.next(val);
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadClients();
  }

  onPerPageChange(): void {
    this.page.set(1);
    this.loadClients();
  }

  goPage(delta: number): void {
    const m = this.meta();
    const cur = m?.current_page ?? 1;
    const last = m?.last_page ?? 1;
    const next = Math.min(Math.max(1, cur + delta), last);
    if (next !== cur) {
      this.page.set(next);
      this.loadClients();
    }
  }

  exportClientsCsv(): void {
    const list = this.clients();
    if (!list.length) {
      this.toastService.error('Aucun client à exporter.');
      return;
    }
    openReportPreviewWindow({
      title: 'Export clients',
      subject: 'Liste courante',
      meta: [{ label: 'Total', value: String(this.meta()?.total ?? list.length) }],
      kpis: [
        { label: 'Clients', value: String(list.length), accent: 'brand' },
        {
          label: 'Véhicules (somme)',
          value: String(list.reduce((sum: number, c: any) => sum + (c.vehicles_count ?? 0), 0)),
          accent: 'neutral',
        },
        { label: 'Période', value: 'Vue actuelle', accent: 'neutral' },
      ],
      tableTitle: 'Clients',
      columns: ['Client', 'Flotte'],
      rows: list.map((c: any) => {
        const ct = c.contacts?.[0];
        const contactName = ct ? `${ct.first_name ?? ''} ${ct.last_name ?? ''}`.trim() : '';
        return {
          label: `${c.name ?? ''}`.trim(),
          value: String(c.vehicles_count ?? 0),
          hint: `${contactName || '—'} • ${ct?.phone ?? '—'} • créé le: ${c.created_at ?? '—'}`,
        };
      }),
    });
    const header = ['ID', 'Nom entreprise', 'Contact principal', 'Téléphone', 'Véhicules', 'Date création'];
    const rows: (string | number)[][] = [
      header,
      ...list.map((c: any) => {
        const ct = c.contacts?.[0];
        const contactName = ct ? `${ct.first_name ?? ''} ${ct.last_name ?? ''}`.trim() : '';
        return [
          c.id,
          c.name ?? '',
          contactName,
          ct?.phone ?? '',
          c.vehicles_count ?? 0,
          c.created_at ?? '',
        ];
      }),
    ];
    downloadCsv(`clients_${new Date().toISOString().slice(0, 10)}`, rows);
    this.toastService.success('Aperçu ouvert + CSV téléchargé.');
  }

  ngOnInit() {
    this.loadClients();
    this.syncSub = this.layoutService.odooSync$.subscribe(() => this.loadClients());
    this.searchSub = this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => {
      this.page.set(1);
      this.loadClients();
    });
  }

  ngOnDestroy() {
    this.syncSub?.unsubscribe();
    this.searchSub?.unsubscribe();
  }

  loadClients() {
    this.loading.set(true);
    this.error.set(false);
    this.accountService.getClients({
      page: this.page(),
      per_page: this.perPage(),
      search: this.searchQuery() || undefined,
      status: this.statusFilter() !== 'all' ? this.statusFilter() : undefined,
      source: this.sourceFilter() !== 'all' ? this.sourceFilter() : undefined,
    }).subscribe({
      next: (res) => {
        this.clients.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(true);
        console.error('[Clients] Erreur:', err);
      }
    });
  }
}
