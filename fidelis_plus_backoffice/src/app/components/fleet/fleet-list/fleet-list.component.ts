import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { VehicleService, Vehicle, FleetStatsPayload, PaginatedMeta } from '../../../services/vehicle.service';
import { ToastService } from '../../../services/toast.service';
import { downloadCsv } from '../../../utils/csv-download';
import { openReportPreviewWindow } from '../../../utils/report-preview-window';
import { AuthService } from '../../../services/auth.service';

/** Filtre combiné « Action Center » : en retard ou bientôt à échéance. */
const FILTER_PRIORITAIRE = 'prioritaire';
const STATUSES_PRIORITAIRE = 'en_retard,bientot';

@Component({
  selector: 'app-fleet-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="animate-fade-in-up">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-extrabold text-on-surface tracking-tight font-headline">Gestion de la Flotte</h1>
          <p class="text-primary font-medium tracking-wide uppercase text-xs mt-1">
            Mayelia CRM • {{ isCommercial ? 'Mon Portefeuille Véhicules' : 'Parc Automobile Global' }}
          </p>
        </div>
        <button type="button" (click)="exportFleetCsv()" class="bg-[#1b1932] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg" title="Exporter la page courante (filtres actifs)">
          <span class="material-symbols-outlined text-lg">download</span>
          Exporter CSV
        </button>
      </div>

      <div class="bg-white rounded-xl p-4 mb-8 flex flex-wrap gap-4 items-end shadow-sm border border-surface-container/30">
        <div class="w-full sm:flex-1 sm:min-w-[160px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Statut visite</label>
          <select [(ngModel)]="filterStatus" (ngModelChange)="onFilterChange()" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-3 focus:ring-primary/20">
            <option value="">Tous les statuts</option>
            <option value="prioritaire">Prioritaire (retard + bientôt)</option>
            <option value="a_jour">À jour</option>
            <option value="en_retard">En retard</option>
            <option value="bientot">Bientôt</option>
          </select>
        </div>
        <div class="w-full sm:flex-1 sm:min-w-[160px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Carburant</label>
          <select [(ngModel)]="filterFuel" (ngModelChange)="onFilterChange()" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-3 focus:ring-primary/20">
            <option value="">Tous</option>
            <option value="diesel">Diesel</option>
            <option value="essence">Essence</option>
            <option value="électrique">Électrique</option>
            <option value="hybride">Hybride</option>
            <option value="gpl">GPL</option>
          </select>
        </div>
        <div class="w-full sm:flex-1 sm:min-w-[220px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Recherche</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">search</span>
            <input type="text" [(ngModel)]="searchText" (ngModelChange)="onSearchInput($event)" placeholder="Plaque, marque, modèle, client…" class="w-full pl-10 bg-surface-container-low border-none rounded-lg text-sm p-3 focus:ring-primary/20 outline-none">
          </div>
        </div>
        <div class="w-full sm:w-auto sm:min-w-[100px]">
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Par page</label>
          <select [ngModel]="perPage()" (ngModelChange)="setPerPage(+$event)" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-3 focus:ring-primary/20">
            <option [ngValue]="10">10</option>
            <option [ngValue]="15">15</option>
            <option [ngValue]="25">25</option>
            <option [ngValue]="50">50</option>
          </select>
        </div>
        <button type="button" (click)="loadVehicles()" class="self-end h-[48px] px-6 bg-surface-container-high text-on-surface-variant rounded-lg hover:bg-surface-variant transition-colors flex items-center gap-2 text-sm font-medium">
          <span class="material-symbols-outlined text-lg" [class.animate-spin]="loading()">refresh</span>
          Actualiser
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-surface-container/30 relative overflow-hidden group">
          <h3 class="text-slate-500 text-xs font-bold uppercase tracking-widest">Total (filtre actif)</h3>
          <p class="text-4xl font-extrabold text-on-surface mt-1 font-headline">{{ fleetStats()?.total ?? '—' }}</p>
          <div class="absolute bottom-0 left-0 w-full h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-surface-container/30 border-l-4 border-l-error relative overflow-hidden">
          <h3 class="text-slate-500 text-xs font-bold uppercase tracking-widest">Visites en retard</h3>
          <p class="text-4xl font-extrabold text-error mt-1 font-headline">{{ countByStatus('en_retard') }}</p>
        </div>
        <div class="bg-white p-6 rounded-xl shadow-sm border border-surface-container/30 border-l-4 border-l-tertiary relative overflow-hidden">
          <h3 class="text-slate-500 text-xs font-bold uppercase tracking-widest">Bientôt à échéance</h3>
          <p class="text-4xl font-extrabold text-on-tertiary-container mt-1 font-headline">{{ countByStatus('bientot') }}</p>
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-surface-container/30 overflow-hidden mb-8">
        <div class="px-6 py-5 flex flex-wrap justify-between items-center gap-4 border-b border-surface-container/50">
          <h2 class="text-lg font-bold text-on-surface font-headline">
            Parc Automobile
            <span class="text-sm font-normal text-outline ml-2">({{ meta()?.total ?? 0 }} résultat(s))</span>
          </h2>
          <div class="flex flex-wrap items-center gap-2 text-sm text-outline">
            <span>Page {{ meta()?.current_page ?? 1 }} / {{ metaLastPage() }}</span>
            <button type="button" (click)="goPage(-1)" [disabled]="loading() || (meta()?.current_page ?? 1) <= 1" class="px-3 py-1.5 rounded-lg bg-surface-container-low font-semibold disabled:opacity-40">Préc.</button>
            <button type="button" (click)="goPage(1)" [disabled]="loading() || (meta()?.current_page ?? 1) >= metaLastPage()" class="px-3 py-1.5 rounded-lg bg-surface-container-low font-semibold disabled:opacity-40">Suiv.</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low/50">
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Immatriculation</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Marque / Modèle</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Client</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Carburant</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Dernière Visite</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Statut</th>
                <th class="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-container/50">
              <tr *ngIf="loading()">
                <td colspan="7" class="px-6 py-16 text-center">
                  <span class="material-symbols-outlined animate-spin text-primary text-4xl block mb-2">sync</span>
                  <p class="text-outline font-medium">Chargement des données de la flotte...</p>
                </td>
              </tr>
              <ng-container *ngIf="!loading()">
                <tr *ngFor="let v of vehiclesPage()"
                    [routerLink]="['/clients', v.company_id, 'vehicules', v.id]"
                    class="hover:bg-surface-container-low transition-colors cursor-pointer group">
                  <td class="px-6 py-4 font-mono font-bold text-sm text-primary">{{ v.license_plate }}</td>
                  <td class="px-6 py-4">
                    <span class="block text-sm font-semibold">{{ v.brand }} {{ v.model }}</span>
                    <span class="text-[10px] text-slate-400">{{ v.year || '—' }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm font-medium text-on-surface">{{ v.company?.name || '—' }}</td>
                  <td class="px-6 py-4 text-sm text-slate-500 capitalize">{{ v.fuel_type || '—' }}</td>
                  <td class="px-6 py-4 text-sm" [class.text-error]="v.status === 'en_retard'" [class.font-bold]="v.status === 'en_retard'">
                    {{ v.last_visit ? (v.last_visit | date:'dd MMM yyyy') : 'Jamais' }}
                  </td>
                  <td class="px-6 py-4">
                    <span *ngIf="v.status === 'a_jour'" class="px-3 py-1 bg-secondary/10 text-secondary text-[10px] font-black rounded-full uppercase tracking-tighter">À Jour</span>
                    <span *ngIf="v.status === 'en_retard'" class="px-3 py-1 bg-error/10 text-error text-[10px] font-black rounded-full uppercase tracking-tighter">En Retard</span>
                    <span *ngIf="v.status === 'bientot'" class="px-3 py-1 bg-tertiary/10 text-on-tertiary-container text-[10px] font-black rounded-full uppercase tracking-tighter">Bientôt</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button type="button" (click)="deleteVehicle(v, $event)" class="p-2 text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                      <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </td>
                </tr>
              </ng-container>
              <tr *ngIf="!loading() && vehiclesPage().length === 0">
                <td colspan="7" class="px-6 py-20 text-center">
                  <span class="material-symbols-outlined text-6xl text-outline/30 block mb-3">no_crash</span>
                  <p class="text-on-surface font-bold text-lg mb-1">Aucun véhicule</p>
                  <p class="text-outline text-sm">Ajustez vos filtres ou ajoutez des véhicules depuis le profil client.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class FleetListComponent implements OnInit {
  vehiclesPage = signal<Vehicle[]>([]);
  meta = signal<PaginatedMeta | null>(null);
  fleetStats = signal<FleetStatsPayload | null>(null);
  loading = signal(true);

  filterStatus = '';
  filterFuel = '';
  searchText = '';
  page = signal(1);
  perPage = signal(15);

  private search$ = new Subject<string>();
  private vehicleService = inject(VehicleService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  get isCommercial(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'commercial';
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(320), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadVehicles();
      });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((qp) => {
      this.applyQueryParamsToFilters(qp);
      this.page.set(1);
      this.loadVehicles();
    });
  }

  /** Synchronise le select « Statut visite » avec l’URL (?priority=1, ?status=…, ?statuses=…). */
  private applyQueryParamsToFilters(qp: ParamMap): void {
    if (qp.get('priority') === '1') {
      this.filterStatus = FILTER_PRIORITAIRE;
      return;
    }
    const statusesRaw = qp.get('statuses');
    if (statusesRaw) {
      const set = new Set(
        statusesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      if (set.size === 2 && set.has('en_retard') && set.has('bientot')) {
        this.filterStatus = FILTER_PRIORITAIRE;
        return;
      }
    }
    const st = qp.get('status');
    const allowedSingle = ['a_jour', 'en_retard', 'bientot'];
    if (st && allowedSingle.includes(st)) {
      this.filterStatus = st;
      return;
    }
    this.filterStatus = '';
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
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.urlQueryParamsForVisitStatus(),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Query string reflétant le statut visite (évite que ?priority=1 réapplique le filtre après « Tous »). */
  private urlQueryParamsForVisitStatus(): Record<string, string | null> {
    return {
      priority: this.filterStatus === FILTER_PRIORITAIRE ? '1' : null,
      status:
        this.filterStatus && this.filterStatus !== FILTER_PRIORITAIRE ? this.filterStatus : null,
      statuses: null,
    };
  }

  setPerPage(n: number): void {
    this.perPage.set(n);
    this.page.set(1);
    this.loadVehicles();
  }

  goPage(delta: number): void {
    const m = this.meta();
    const cur = m?.current_page ?? 1;
    const last = this.metaLastPage();
    const next = Math.min(last, Math.max(1, cur + delta));
    if (next === cur) return;
    this.page.set(next);
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.loading.set(true);
    const statusSingle =
      this.filterStatus && this.filterStatus !== FILTER_PRIORITAIRE ? this.filterStatus : undefined;
    const statusesMulti =
      this.filterStatus === FILTER_PRIORITAIRE ? STATUSES_PRIORITAIRE : undefined;
    const listParams = {
      status: statusSingle,
      statuses: statusesMulti,
      fuel_type: this.filterFuel || undefined,
      search: this.searchText.trim() || undefined,
      page: this.page(),
      per_page: this.perPage(),
    };
    const statsParams = {
      status: listParams.status,
      statuses: listParams.statuses,
      fuel_type: listParams.fuel_type,
      search: listParams.search,
    };
    forkJoin({
      list: this.vehicleService.getPage(listParams),
      stats: this.vehicleService.getFleetStats(statsParams),
    }).subscribe({
      next: ({ list, stats }) => {
        this.vehiclesPage.set(list.data);
        this.meta.set(list.meta);
        this.fleetStats.set(stats);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Erreur lors du chargement de la flotte.');
        console.error(err);
      },
    });
  }

  countByStatus(status: string): number {
    return this.fleetStats()?.by_status?.[status] ?? 0;
  }

  exportFleetCsv(): void {
    const rows = this.vehiclesPage();
    if (!rows.length) {
      this.toastService.error('Aucune ligne à exporter sur cette page.');
      return;
    }
    openReportPreviewWindow({
      title: 'Export flotte',
      subject: 'Page courante (filtres actifs)',
      meta: [
        { label: 'Statut visite', value: this.filterStatus || 'Tous' },
        { label: 'Carburant', value: this.filterFuel || 'Tous' },
      ],
      kpis: [
        { label: 'Résultats (page)', value: String(rows.length), accent: 'neutral' },
        { label: 'Page', value: String(this.page()), accent: 'neutral' },
        { label: 'En retard', value: String(this.countByStatus('en_retard')), accent: 'error' },
      ],
      tableTitle: 'Véhicules (page)',
      columns: ['Véhicule', 'Statut'],
      rows: rows.map((v) => ({
        label: `${v.license_plate} — ${v.brand} ${v.model}`,
        value: String(v.status ?? ''),
        hint: `${v.company?.name ?? '—'} • ${v.fuel_type ?? '—'} • dernière visite: ${v.last_visit ?? '—'}`,
      })),
    });
    const header = [
      'Immatriculation',
      'Marque',
      'Modèle',
      'Année',
      'Client',
      'Carburant',
      'Dernière visite',
      'Statut',
    ];
    const data: (string | number)[][] = [
      header,
      ...rows.map((v) => [
        v.license_plate,
        v.brand,
        v.model,
        v.year ?? '',
        v.company?.name ?? '',
        v.fuel_type ?? '',
        v.last_visit ?? '',
        v.status ?? '',
      ]),
    ];
    downloadCsv(`flotte_page${this.page()}_${new Date().toISOString().slice(0, 10)}`, data);
    this.toastService.success('Aperçu ouvert + CSV exporté (page affichée).');
  }

  deleteVehicle(v: Vehicle, event: Event): void {
    event.stopPropagation();
    if (confirm(`Supprimer le véhicule ${v.license_plate} ?`)) {
      this.vehicleService.delete(v.id).subscribe({
        next: () => {
          this.toastService.success(`Véhicule ${v.license_plate} supprimé.`);
          this.loadVehicles();
        },
        error: () => this.toastService.error('Erreur lors de la suppression.'),
      });
    }
  }
}
