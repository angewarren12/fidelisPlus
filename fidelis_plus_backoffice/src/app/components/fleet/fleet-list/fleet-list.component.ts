import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { VehicleService, Vehicle, FleetStatsPayload, PaginatedMeta, VehicleImportResult } from '../../../services/vehicle.service';
import { ToastService } from '../../../services/toast.service';
import { downloadCsv } from '../../../utils/csv-download';
import { openReportPreviewWindow } from '../../../utils/report-preview-window';
import { AuthService } from '../../../services/auth.service';
import { AccountService } from '../../../services/account.service';
import { vehicleStatusLabel, vehicleStatusBadgeClass } from '../../../utils/vehicle-status';

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
        <div class="flex items-center gap-3">
          <button type="button" (click)="openImportModal()" class="bg-white border border-outline-variant/30 text-on-surface px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-surface-container transition-all shadow-sm">
            <span class="material-symbols-outlined text-lg">upload_file</span>
            Importer (Excel)
          </button>
          <button type="button" (click)="exportFleetCsv()" class="bg-[#1b1932] text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg" title="Exporter la page courante (filtres actifs)">
            <span class="material-symbols-outlined text-lg">download</span>
            Exporter CSV
          </button>
        </div>
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
            <option value="jamais_controle">Jamais contrôlé</option>
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

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <div class="bg-white p-6 rounded-xl shadow-sm border border-surface-container/30 border-l-4 border-l-slate-400 relative overflow-hidden">
          <h3 class="text-slate-500 text-xs font-bold uppercase tracking-widest">Jamais contrôlé</h3>
          <p class="text-4xl font-extrabold text-slate-500 mt-1 font-headline">{{ countByStatus('jamais_controle') }}</p>
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
            <div class="flex items-center gap-1 bg-surface-container-low rounded-xl p-1 ml-2">
              <button type="button" (click)="viewMode.set('list')" title="Vue liste"
                [class]="'w-9 h-9 rounded-lg flex items-center justify-center transition-all ' + (viewMode() === 'list' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
                <span class="material-symbols-outlined text-lg">view_list</span>
              </button>
              <button type="button" (click)="viewMode.set('cards')" title="Vue cartes"
                [class]="'w-9 h-9 rounded-lg flex items-center justify-center transition-all ' + (viewMode() === 'cards' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface')">
                <span class="material-symbols-outlined text-lg">grid_view</span>
              </button>
            </div>
          </div>
        </div>
        <div *ngIf="viewMode() === 'list'" class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-surface-container-low/50">
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Immatriculation</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Marque / Modèle</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Client</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Carburant</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Dernière Visite</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Statut</th>
                <th class="px-6 py-4 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Provenance</th>
                <th class="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-container/50">
              <tr *ngIf="loading()">
                <td colspan="8" class="px-6 py-16 text-center">
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
                    <ng-container *ngIf="v.last_visit; else noVisit">
                      {{ v.last_visit | date:'dd MMM yyyy' }}
                    </ng-container>
                    <ng-template #noVisit>
                      <span class="text-slate-400">—</span>
                    </ng-template>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter" [ngClass]="statusBadgeClass(v.status)">{{ statusLabel(v.status) }}</span>
                  </td>
                  <td class="px-6 py-4">
                    <span *ngIf="v.created_via_odoo" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#714B67]/10 text-[#714B67]">Odoo</span>
                    <span *ngIf="!v.created_via_odoo" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">FidelisPlus</span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button type="button" (click)="deleteVehicle(v, $event)" class="p-2 text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100">
                      <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </td>
                </tr>
              </ng-container>
              <tr *ngIf="!loading() && vehiclesPage().length === 0">
                <td colspan="8" class="px-6 py-20 text-center">
                  <span class="material-symbols-outlined text-6xl text-outline/30 block mb-3">no_crash</span>
                  <p class="text-on-surface font-bold text-lg mb-1">Aucun véhicule</p>
                  <p class="text-outline text-sm">Ajustez vos filtres ou ajoutez des véhicules depuis le profil client.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- VUE CARTES -->
        <div *ngIf="viewMode() === 'cards'" class="p-6">
          <div *ngIf="loading()" class="py-16 text-center">
            <span class="material-symbols-outlined animate-spin text-primary text-4xl block mb-2">sync</span>
            <p class="text-outline font-medium">Chargement des données de la flotte...</p>
          </div>
          <div *ngIf="!loading()" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div *ngFor="let v of vehiclesPage()"
                 [routerLink]="['/clients', v.company_id, 'vehicules', v.id]"
                 class="bg-white rounded-2xl border border-outline-variant/10 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-mono font-black text-primary text-lg">{{ v.license_plate }}</p>
                  <p class="text-sm font-semibold text-on-surface">{{ v.brand }} {{ v.model }}</p>
                </div>
                <button type="button" (click)="deleteVehicle(v, $event)" class="p-1.5 text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="bg-surface-container-low rounded-xl p-3">
                  <p class="text-outline/60 font-bold uppercase tracking-wider mb-0.5">Client</p>
                  <p class="font-bold text-on-surface truncate">{{ v.company?.name || '—' }}</p>
                </div>
                <div class="bg-surface-container-low rounded-xl p-3">
                  <p class="text-outline/60 font-bold uppercase tracking-wider mb-0.5">Carburant</p>
                  <p class="font-bold text-on-surface capitalize">{{ v.fuel_type || '—' }}</p>
                </div>
              </div>
              <div class="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                <div>
                  <p class="text-[9px] font-bold text-outline uppercase tracking-widest mb-0.5">Dernière visite</p>
                  <span class="text-xs font-bold" [class.text-error]="v.status === 'en_retard'">
                    {{ v.last_visit ? (v.last_visit | date:'dd MMM yyyy') : '—' }}
                  </span>
                </div>
                <span class="px-2.5 py-1 text-[9px] font-black rounded-full uppercase tracking-tighter" [ngClass]="statusBadgeClass(v.status)">{{ statusLabel(v.status) }}</span>
              </div>
              <div>
                <span *ngIf="v.created_via_odoo" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#714B67]/10 text-[#714B67]">Odoo</span>
                <span *ngIf="!v.created_via_odoo" class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary">FidelisPlus</span>
              </div>
            </div>
            <div *ngIf="vehiclesPage().length === 0" class="col-span-full py-20 text-center">
              <span class="material-symbols-outlined text-6xl text-outline/30 block mb-3">no_crash</span>
              <p class="text-on-surface font-bold text-lg mb-1">Aucun véhicule</p>
              <p class="text-outline text-sm">Ajustez vos filtres ou ajoutez des véhicules depuis le profil client.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- IMPORT EXCEL MODAL -->
      <div *ngIf="showImportModal()" class="fixed inset-0 z-[200] overflow-y-auto flex items-start justify-center p-4 py-10 bg-[#1b1932]/40 backdrop-blur-sm animate-fade-in">
        <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
          <div class="p-6 border-b border-surface-container flex items-center justify-between">
            <h3 class="text-xl font-headline font-black text-on-surface">Importer des véhicules (Excel)</h3>
            <button (click)="closeImportModal()" aria-label="Fermer" class="text-outline hover:text-on-surface p-1">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div class="p-6 space-y-6" *ngIf="!importResult()">
            <div>
              <p class="text-xs font-bold uppercase tracking-widest text-outline mb-2">1. Modèle Excel</p>
              <button type="button" (click)="downloadTemplate()" class="text-primary text-sm font-bold flex items-center gap-1.5 hover:underline">
                <span class="material-symbols-outlined text-lg">description</span>
                Télécharger le modèle "INFO PARC AUTO CLIENTS"
              </button>
            </div>

            <div>
              <p class="text-xs font-bold uppercase tracking-widest text-outline mb-2">2. Client concerné</p>
              <select [(ngModel)]="importClientMode" (ngModelChange)="onImportClientModeChange()" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-3 mb-3 focus:ring-primary/20">
                <option value="existing">Client existant</option>
                <option value="new">Nouveau client (pas encore dans la base)</option>
              </select>

              <select *ngIf="importClientMode === 'existing'" [(ngModel)]="importCompanyId" class="w-full bg-surface-container-low border-none rounded-lg text-sm p-3 focus:ring-primary/20">
                <option [ngValue]="null">— Sélectionner un client —</option>
                <option *ngFor="let c of clients()" [ngValue]="c.id">{{ c.name }}</option>
              </select>

              <input *ngIf="importClientMode === 'new'" type="text" [(ngModel)]="importCompanyName" placeholder="Nom du nouveau client"
                class="w-full bg-surface-container-low border-none rounded-lg text-sm p-3 focus:ring-primary/20 outline-none">
              <p *ngIf="importClientMode === 'new'" class="text-[10px] text-outline/70 mt-1.5">Ce client sera créé automatiquement lors de l'import.</p>
            </div>

            <div>
              <p class="text-xs font-bold uppercase tracking-widest text-outline mb-2">3. Fichier rempli</p>
              <div (click)="importFileInput.click()"
                   [class]="'group border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ' + (selectedImportFile ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container-low')">
                <span class="material-symbols-outlined text-4xl" [class.text-primary]="selectedImportFile">{{ selectedImportFile ? 'description' : 'upload_file' }}</span>
                <p class="text-xs font-bold text-center">{{ selectedImportFile ? selectedImportFile.name : 'Choisir le fichier Excel rempli (.xlsx)' }}</p>
                <input #importFileInput type="file" (change)="handleImportFile($event)" accept=".xlsx,.xls,.csv" class="hidden">
              </div>
            </div>
          </div>

          <div *ngIf="importResult() as result" class="p-6 space-y-3">
            <div class="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <p class="text-[10px] font-bold uppercase tracking-widest text-primary/70">Véhicules importés pour {{ result.company_name }}</p>
              <p class="text-2xl font-black text-primary">{{ result.created }}</p>
            </div>
            <div *ngIf="result.errors_count > 0" class="bg-error/5 border border-error/20 rounded-xl p-4 max-h-56 overflow-y-auto">
              <p class="text-[10px] font-bold uppercase tracking-widest text-error mb-2">{{ result.errors_count }} ligne(s) ignorée(s)</p>
              <ul class="space-y-1">
                <li *ngFor="let e of result.errors" class="text-xs text-on-surface">
                  Ligne {{ e.row }} <span *ngIf="e.license_plate">({{ e.license_plate }})</span> : {{ e.message }}
                </li>
              </ul>
            </div>
          </div>

          <div class="p-6 border-t border-surface-container flex justify-end gap-3">
            <button (click)="closeImportModal()" class="px-5 py-2.5 text-outline hover:text-on-surface font-bold text-xs uppercase tracking-widest transition-colors">
              {{ importResult() ? 'Fermer' : 'Annuler' }}
            </button>
            <button *ngIf="!importResult()" (click)="submitImport()" [disabled]="!canSubmitImport() || importing()"
              class="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-2">
              <span class="material-symbols-outlined text-sm animate-spin" *ngIf="importing()">sync</span>
              {{ importing() ? 'Import en cours…' : "Lancer l'import" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  `],
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
  viewMode = signal<'list' | 'cards'>('list');

  private search$ = new Subject<string>();
  private vehicleService = inject(VehicleService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private accountService = inject(AccountService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  clients = signal<{ id: number; name: string }[]>([]);
  showImportModal = signal(false);
  importing = signal(false);
  importResult = signal<VehicleImportResult | null>(null);
  importClientMode: 'existing' | 'new' = 'existing';
  importCompanyId: number | null = null;
  importCompanyName = '';
  selectedImportFile: File | null = null;

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
    const allowedSingle = ['a_jour', 'en_retard', 'bientot', 'jamais_controle'];
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

  statusLabel = vehicleStatusLabel;
  statusBadgeClass = vehicleStatusBadgeClass;

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

  openImportModal(): void {
    this.importClientMode = 'existing';
    this.importCompanyId = null;
    this.importCompanyName = '';
    this.selectedImportFile = null;
    this.importResult.set(null);
    this.showImportModal.set(true);
    if (this.clients().length === 0) {
      this.accountService.getClients().subscribe({
        next: (list) => this.clients.set(list),
        error: () => this.toastService.error('Erreur lors du chargement de la liste des clients.'),
      });
    }
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    if (this.importResult()?.created) {
      this.loadVehicles();
    }
  }

  onImportClientModeChange(): void {
    this.importCompanyId = null;
    this.importCompanyName = '';
  }

  canSubmitImport(): boolean {
    if (!this.selectedImportFile) return false;
    return this.importClientMode === 'existing'
      ? this.importCompanyId != null
      : this.importCompanyName.trim().length > 0;
  }

  downloadTemplate(): void {
    this.vehicleService.downloadImportTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modele_import_flotte_fidelisplus.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toastService.error('Erreur lors du téléchargement du modèle.'),
    });
  }

  handleImportFile(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedImportFile = file;
      this.importResult.set(null);
    }
  }

  submitImport(): void {
    if (!this.selectedImportFile || !this.canSubmitImport()) return;

    this.importing.set(true);
    const target = this.importClientMode === 'existing'
      ? { companyId: this.importCompanyId! }
      : { companyName: this.importCompanyName.trim() };

    this.vehicleService.importFromExcel(target, this.selectedImportFile).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        if (result.created > 0) {
          this.toastService.success(`${result.created} véhicule(s) importé(s) pour ${result.company_name}.`);
        }
      },
      error: () => {
        this.importing.set(false);
        this.toastService.error("Erreur lors de l'import du fichier.");
      },
    });
  }
}
