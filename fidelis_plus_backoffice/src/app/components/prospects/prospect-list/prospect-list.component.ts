import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { ProspectService, PaginatedMeta } from '../../../services/prospect.service';
import { ToastService } from '../../../services/toast.service';
import { Prospect } from '../../../models/prospect.model';
import { AuthService } from '../../../services/auth.service';
import { TeamService } from '../../../services/team.service';

@Component({
  selector: 'app-prospect-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="space-y-8 animate-fade-in-up">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div class="space-y-1">
          <h2 class="text-3xl font-headline font-extrabold text-[#1a1831] tracking-tight">Prospection Pipeline</h2>
          <p class="text-on-surface-variant text-sm font-medium">Suivi des opportunités — filtres et recherche dynamiques</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="bg-primary-container/10 px-4 py-2 rounded-xl flex items-center gap-3">
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-primary font-bold uppercase tracking-wider">Pipeline (filtre)</span>
              <span class="text-xl font-headline font-bold text-primary">{{ totalPotential() | number:'1.0-0' }} FCFA</span>
            </div>
          </div>
          <div class="bg-secondary-container/20 px-4 py-2 rounded-xl flex items-center gap-3">
            <div class="flex flex-col items-end">
              <span class="text-[10px] text-secondary font-bold uppercase tracking-wider">Résultats</span>
              <span class="text-xl font-headline font-bold text-secondary">{{ meta()?.total ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-sm border border-surface-container/30 flex flex-wrap gap-4 items-end">
        <div class="w-full sm:flex-1 sm:min-w-[200px]">
          <label class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">Recherche</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input type="text" [(ngModel)]="searchText" (ngModelChange)="onSearchInput($event)" placeholder="Entreprise, contact, téléphone…" class="w-full pl-10 pr-3 py-3 rounded-xl bg-surface-container-low border-none text-sm outline-none focus:ring-2 focus:ring-primary/30">
          </div>
        </div>
        <div class="w-full sm:w-36">
          <label class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">Température</label>
          <select [(ngModel)]="filterTemperature" (ngModelChange)="onFilterChange()" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-semibold outline-none">
            <option value="">Toutes</option>
            <option value="chaud">Chaud</option>
            <option value="tiede">Tiède</option>
            <option value="froid">Froid</option>
          </select>
        </div>
        <div class="w-full sm:w-36">
          <label class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">Type</label>
          <select [(ngModel)]="filterCompanyType" (ngModelChange)="onFilterChange()" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-semibold outline-none">
            <option value="">Tous</option>
            <option value="flotte">Flotte</option>
            <option value="apporteur">Apporteur</option>
            <option value="garage">Garage</option>
          </select>
        </div>
        <div *ngIf="isAdmin()" class="w-full sm:w-40">
          <label class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">Commercial</label>
          <select [(ngModel)]="filterCommercialId" (ngModelChange)="onFilterChange()" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-semibold outline-none">
            <option value="">Tous</option>
            <option *ngFor="let c of commercials()" [value]="c.id">{{ c.first_name }} {{ c.last_name }}</option>
          </select>
        </div>
        <div class="w-full sm:w-36">
          <label class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">Secteur</label>
          <select [(ngModel)]="filterSector" (ngModelChange)="onFilterChange()" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-semibold outline-none">
            <option value="">Tous secteurs</option>
            <option *ngFor="let s of sectors()" [value]="s">{{ s }}</option>
          </select>
        </div>
        <div class="w-full sm:w-36">
          <label class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">Source lead</label>
          <select [(ngModel)]="filterLeadSource" (ngModelChange)="onFilterChange()" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-semibold outline-none">
            <option value="">Toutes sources</option>
            <option *ngFor="let src of leadSources()" [value]="src">{{ src }}</option>
          </select>
        </div>
        <div class="w-full sm:w-24">
          <label class="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">Par page</label>
          <select [ngModel]="perPage()" (ngModelChange)="setPerPage(+$event)" class="w-full py-3 px-3 rounded-xl bg-surface-container-low border-none text-sm font-semibold outline-none">
            <option [ngValue]="10">10</option>
            <option [ngValue]="15">15</option>
            <option [ngValue]="25">25</option>
            <option [ngValue]="50">50</option>
          </select>
        </div>
        <button type="button" (click)="loadProspects()" class="h-12 px-4 rounded-xl bg-surface-container-high text-on-surface text-sm font-bold flex items-center gap-1.5 shrink-0">
          <span class="material-symbols-outlined text-lg" [class.animate-spin]="loading()">refresh</span>
          Actualiser
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-4 mb-2">
        <button routerLink="/prospection/nouveau" class="bg-primary hover:bg-secondary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95">
          <span class="material-symbols-outlined">add</span>
          Ajouter Prospect
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface-variant mb-2 px-1">
        <span>Page {{ meta()?.current_page ?? 1 }} / {{ metaLastPage() }} — {{ meta()?.total ?? 0 }} prospect(s)</span>
        <div class="flex gap-2">
          <button type="button" (click)="goPage(-1)" [disabled]="loading() || (meta()?.current_page ?? 1) <= 1" class="px-3 py-1.5 rounded-lg bg-surface-container-low font-bold disabled:opacity-40 text-xs uppercase tracking-wide">Précédent</button>
          <button type="button" (click)="goPage(1)" [disabled]="loading() || (meta()?.current_page ?? 1) >= metaLastPage()" class="px-3 py-1.5 rounded-lg bg-surface-container-low font-bold disabled:opacity-40 text-xs uppercase tracking-wide">Suivant</button>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-surface-container/30">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/50">
              <th class="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">Entreprise</th>
              <th class="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">Correspondant</th>
              <th class="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest text-center">Température</th>
              <th class="px-6 py-4 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">Dernière Activité</th>
              <th class="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container-low">
            <tr *ngIf="loading()">
              <td colspan="5" class="px-6 py-16 text-center">
                <span class="material-symbols-outlined animate-spin text-primary text-4xl">sync</span>
                <p class="text-outline font-medium mt-2">Chargement des prospects...</p>
              </td>
            </tr>
            <ng-container *ngIf="!loading()">
              <tr *ngFor="let p of prospects()" class="group hover:bg-surface-container-low/30 transition-colors cursor-pointer">
                <td class="px-6 py-5">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center font-bold text-outline text-lg">
                      {{ p.name.charAt(0) }}
                    </div>
                    <div>
                      <p class="font-bold text-[#1a1831] text-sm">{{ p.name }}</p>
                      <p class="text-xs text-on-surface-variant">{{ p.sector || 'Secteur non défini' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div *ngIf="p.contacts && p.contacts.length > 0">
                    <p class="font-semibold text-sm">{{ p.contacts[0].first_name }} {{ p.contacts[0].last_name }}</p>
                    <p class="text-xs text-on-surface-variant">{{ p.contacts[0].phone }}</p>
                  </div>
                </td>
                <td class="px-6 py-5 text-center">
                  <select [value]="p.temperature"
                          (change)="updateTemperature(p, $any($event.target).value)"
                          [class]="'px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter cursor-pointer border-none outline-none focus:ring-2 focus:ring-primary/50 ' + getTempClass(p.temperature)">
                    <option value="chaud" class="bg-white text-error">CHAUD</option>
                    <option value="tiede" class="bg-white text-amber-600">TIÈDE</option>
                    <option value="froid" class="bg-white text-blue-600">FROID</option>
                    <option *ngIf="!['chaud','tiede','froid'].includes(p.temperature)" [value]="p.temperature" class="bg-white text-outline">{{ p.temperature }}</option>
                  </select>
                </td>
                <td class="px-6 py-5">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium">{{ (p.last_contact_date || p.created_at) | date:'short' }}</span>
                    <span class="text-[11px] text-on-surface-variant italic">{{ p.lead_source }}</span>
                  </div>
                </td>
                <td class="px-6 py-5 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button *ngIf="p.temperature === 'chaud'" type="button"
                            (click)="openConvertModal(p)"
                            class="px-3 py-1.5 bg-secondary text-white text-[10px] font-bold rounded-lg hover:brightness-110 transition-all uppercase tracking-wider">
                      Convertir Client
                    </button>
                    <button *ngIf="p.temperature !== 'chaud'" type="button"
                            disabled
                            title="Seuls les prospects CHAUDS peuvent être convertis en clients"
                            class="px-3 py-1.5 bg-surface-container text-outline text-[10px] font-bold rounded-lg cursor-not-allowed uppercase tracking-wider">
                      Convertir Client
                    </button>
                    <span class="p-2 text-outline">
                      <span class="material-symbols-outlined">more_vert</span>
                    </span>
                  </div>
                </td>
              </tr>
              <tr *ngIf="prospects().length === 0">
                <td colspan="5" class="px-6 py-20 text-center">
                  <span class="material-symbols-outlined text-4xl text-outline/30 mb-2">search_off</span>
                  <p class="text-outline font-medium">Aucun prospect pour ces critères.</p>
                </td>
              </tr>
            </ng-container>
          </tbody>
        </table>
      </div>

      <div class="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-surface-container/30 flex items-center gap-5">
          <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <span class="material-symbols-outlined">trending_up</span>
          </div>
          <div>
            <h4 class="text-xs font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">Objectif Trimestriel</h4>
            <div class="flex items-end gap-2">
              <span class="text-2xl font-headline font-extrabold text-[#1a1831]">
                {{ summary()?.quarter_target?.progress_pct != null ? summary()?.quarter_target.progress_pct + '%' : 'N/A' }}
              </span>
              <span class="text-[10px] text-primary font-bold mb-1">
                {{ summary()?.quarter_target ? summary()?.quarter_target.actual + ' / ' + summary()?.quarter_target.target + ' clients' : 'Aucun objectif défini' }}
              </span>
            </div>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-surface-container/30 flex items-center gap-5">
          <div class="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-600">
            <span class="material-symbols-outlined">hourglass_empty</span>
          </div>
          <div>
            <h4 class="text-xs font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">Délai Moyen Closing</h4>
            <div class="flex items-end gap-2">
              <span class="text-2xl font-headline font-extrabold text-[#1a1831]">
                {{ summary()?.avg_closing_days != null ? summary()?.avg_closing_days + ' Jours' : 'N/A' }}
              </span>
              <span class="text-[10px] text-amber-600 font-bold mb-1">
                Calculé sur l'historique réel
              </span>
            </div>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-surface-container/30 flex items-center gap-5">
          <div class="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center text-secondary">
            <span class="material-symbols-outlined">fact_check</span>
          </div>
          <div>
            <h4 class="text-xs font-extrabold text-on-surface-variant uppercase tracking-widest mb-1">Prospects Chauds (filtre)</h4>
            <div class="flex items-end gap-2">
              <span class="text-2xl font-headline font-extrabold text-[#1a1831]">{{ hotProspectsCount() }}</span>
              <span class="text-[10px] text-secondary font-bold mb-1">Potentiel élevé</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal : confirmation conversion prospect → client -->
      <div *ngIf="prospectToConvert()" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-[#0f172a]/75 backdrop-blur-sm" (click)="cancelConvertModal()"></div>
        <div class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 border border-outline-variant/10">
          <div class="flex items-start gap-4 mb-6">
            <div class="w-14 h-14 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-3xl">swap_horiz</span>
            </div>
            <div>
              <h3 class="text-2xl font-headline font-black text-[#1a1831] mb-2">Convertir en client ?</h3>
              <p class="text-sm text-on-surface-variant font-medium leading-relaxed">
                <strong class="text-on-surface">{{ prospectToConvert()?.name }}</strong> passera du statut <strong>prospect</strong> au statut <strong>client actif</strong> dans le CRM. Cette action est généralement définitive pour le cycle prospection.
              </p>
            </div>
          </div>
          <p class="text-xs text-outline italic mb-8 pl-1 border-l-2 border-secondary/30">
            Vérifiez que le dossier commercial est complet avant de valider.
          </p>
          <div class="flex gap-4">
            <button type="button" (click)="cancelConvertModal()" [disabled]="convertSubmitting()" class="flex-1 py-4 rounded-xl bg-surface-container text-on-surface text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button type="button" (click)="confirmConvertToClient()" [disabled]="convertSubmitting()" class="flex-1 py-4 rounded-xl bg-secondary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-secondary/25 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <span *ngIf="convertSubmitting()" class="material-symbols-outlined text-lg animate-spin">sync</span>
              Confirmer la conversion
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
})
export class ProspectListComponent implements OnInit {
  prospects = signal<Prospect[]>([]);
  meta = signal<PaginatedMeta | null>(null);
  summary = signal<any | null>(null);
  sectors = signal<string[]>([]);
  leadSources = signal<string[]>([]);
  loading = signal(true);

  searchText = '';
  filterTemperature = '';
  filterSector = '';
  filterLeadSource = '';
  filterCompanyType = '';
  filterCommercialId = '';
  commercials = signal<any[]>([]);
  page = signal(1);
  perPage = signal(15);

  private search$ = new Subject<string>();
  private prospectService = inject(ProspectService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private teamService = inject(TeamService);
  private destroyRef = inject(DestroyRef);

  prospectToConvert = signal<Prospect | null>(null);
  convertSubmitting = signal(false);

  isAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadProspects();
      });

    forkJoin({
      sectors: this.prospectService.getSectors(),
      sources: this.prospectService.getLeadSources(),
    }).subscribe({
      next: ({ sectors, sources }) => {
        this.sectors.set(sectors ?? []);
        this.leadSources.set(sources ?? []);
      },
      error: () => {
        this.sectors.set([]);
        this.leadSources.set([]);
      },
    });

    if (this.isAdmin()) {
      this.teamService.getAll('commercial').subscribe({
        next: (list) => this.commercials.set(list ?? []),
        error: () => this.commercials.set([])
      });
    }

    this.loadProspects();
  }

  metaLastPage(): number {
    const m = this.meta();
    return m?.last_page && m.last_page > 0 ? m.last_page : 1;
  }

  onSearchInput(value: string): void {
    this.searchText = value;
    this.search$.next(value.trim());
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadProspects();
  }

  setPerPage(n: number): void {
    this.perPage.set(n);
    this.page.set(1);
    this.loadProspects();
  }

  goPage(delta: number): void {
    const m = this.meta();
    const cur = m?.current_page ?? 1;
    const last = this.metaLastPage();
    const next = Math.min(last, Math.max(1, cur + delta));
    if (next === cur) return;
    this.page.set(next);
    this.loadProspects();
  }

  loadProspects(): void {
    this.loading.set(true);
    this.prospectService
      .getProspectsPage({
        page: this.page(),
        per_page: this.perPage(),
        search: this.searchText.trim() || undefined,
        temperature: this.filterTemperature || undefined,
        sector: this.filterSector || undefined,
        lead_source: this.filterLeadSource || undefined,
        commercial_id: this.filterCommercialId ? Number(this.filterCommercialId) : undefined,
        company_type: this.filterCompanyType || undefined,
      })
      .subscribe({
        next: (res) => {
          this.prospects.set(res.data);
          this.meta.set(res.meta);
          this.summary.set(res.summary);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          console.error('[Prospects] Erreur API:', err.status, err.message, err.error);
          this.toastService.error('Impossible de charger les prospects.');
        },
      });
  }

  openConvertModal(prospect: Prospect): void {
    if (prospect.temperature !== 'chaud') {
      this.toastService.error(`Impossible : le prospect ${prospect.name} doit être « CHAUD » pour être converti.`);
      return;
    }
    this.prospectToConvert.set(prospect);
  }

  cancelConvertModal(): void {
    if (this.convertSubmitting()) return;
    this.prospectToConvert.set(null);
  }

  confirmConvertToClient(): void {
    const prospect = this.prospectToConvert();
    if (!prospect || prospect.temperature !== 'chaud') return;

    this.convertSubmitting.set(true);
    this.prospectService.convertToClient(prospect.id).subscribe({
      next: () => {
        this.convertSubmitting.set(false);
        this.prospectToConvert.set(null);
        this.loadProspects();
        this.toastService.success(`${prospect.name} est maintenant un client.`);
      },
      error: () => {
        this.convertSubmitting.set(false);
        this.toastService.error('Erreur lors de la conversion.');
      },
    });
  }

  updateTemperature(prospect: Prospect, newTemp: string): void {
    this.prospects.update((list) => list.map((p) => (p.id === prospect.id ? { ...p, temperature: newTemp as any } : p)));

    this.prospectService.updateTemperature(prospect.id, newTemp).subscribe({
      next: () => {
        this.toastService.success(`La température de ${prospect.name} est passée à ${newTemp}.`);
        this.loadProspects();
      },
      error: () => {
        this.prospects.update((list) =>
          list.map((p) => (p.id === prospect.id ? { ...p, temperature: prospect.temperature } : p))
        );
        this.toastService.error('Erreur lors de la mise à jour de la température.');
      },
    });
  }

  getTempClass(temp: string): string {
    switch (temp) {
      case 'chaud':
        return 'bg-error/10 text-error';
      case 'tiede':
        return 'bg-amber-500/10 text-amber-600';
      case 'froid':
        return 'bg-blue-500/10 text-blue-600';
      default:
        return 'bg-surface-container-high text-outline';
    }
  }

  totalPotential = () => this.summary()?.pipeline_total ?? 0;

  hotProspectsCount = () => this.summary()?.hot_count ?? 0;
}
