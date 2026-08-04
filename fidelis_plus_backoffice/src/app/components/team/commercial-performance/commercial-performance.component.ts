import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DashboardService, DashboardStats } from '../../../services/dashboard.service';
import { TeamService, User } from '../../../services/team.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { downloadCsv } from '../../../utils/csv-download';
import { buildDashboardStatsCsvRows } from '../../../utils/dashboard-stats-export';
import { openReportPreviewWindow } from '../../../utils/report-preview-window';
import { KpiTargetService, PeriodType, KpiProgressResponse } from '../../../services/kpi-target.service';

@Component({
  selector: 'app-commercial-performance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="space-y-10 animate-fade-in pb-20">
      <a routerLink="/equipe" class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-outline hover:text-primary transition-colors">
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        Retour à l'équipe
      </a>

      <div *ngIf="loading()" class="flex flex-col items-center justify-center py-24 gap-4 text-outline">
        <span class="material-symbols-outlined animate-spin text-primary text-5xl">sync</span>
        <p class="font-medium text-sm">Chargement des performances…</p>
      </div>

      <div *ngIf="!loading() && error()" class="rounded-2xl border border-error/30 bg-error/5 p-8 max-w-xl">
        <p class="text-error font-bold mb-2">Impossible de charger cette page</p>
        <p class="text-sm text-on-surface mb-6">{{ error() }}</p>
        <div class="flex flex-wrap gap-3">
          <button type="button" (click)="retry()" class="px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest">
            Réessayer
          </button>
          <a routerLink="/equipe" class="px-6 py-3 rounded-xl bg-surface-container text-on-surface text-xs font-black uppercase tracking-widest inline-flex items-center">
            Retour équipe
          </a>
        </div>
      </div>

      <ng-container *ngIf="!loading() && !error() && stats() && commercial()">
        <!-- Header Performances -->
        <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 class="text-3xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
              Performances : <span class="text-primary">{{ commercial()!.first_name }} {{ commercial()!.last_name }}</span>
            </h1>
            <p class="text-outline text-sm font-medium mt-2">Indicateurs filtrés uniquement sur le portefeuille de ce vendeur.</p>
          </div>
        </section>

        <!-- KPI Globaux -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div class="relative bg-[#1b1932] p-8 rounded-[2rem] overflow-hidden shadow-2xl">
            <div class="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-[60px] -mr-16 -mt-16"></div>
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-6">
                <span class="material-symbols-outlined text-primary text-3xl">payments</span>
              </div>
              <p class="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">CA Généré</p>
              <h3 class="text-3xl font-headline font-black text-white">{{ stats()!.revenue.total_accepted | currency:'XOF':'symbol':'1.0-2' }}</h3>
            </div>
          </div>

          <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm group">
            <div class="flex items-center justify-between mb-6">
              <span class="material-symbols-outlined text-tertiary text-3xl">group</span>
              <div class="text-right">
                <span class="block text-[10px] font-black text-secondary tracking-widest">{{ stats()!.crm.conversion_rate }}% TAUX CONV.</span>
              </div>
            </div>
            <div class="flex items-end gap-1 mb-1">
              <h3 class="text-3xl font-headline font-black text-on-surface">{{ stats()!.crm.total_clients }}</h3>
              <span class="text-outline text-xs font-bold pb-1.5">/ {{ stats()!.crm.total_prospects }}</span>
            </div>
            <p class="text-outline/60 text-[10px] font-black uppercase tracking-[0.2em]">Clients Actifs vs Prospects</p>
          </div>

          <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm group">
            <div class="flex items-center justify-between mb-6">
              <span class="material-symbols-outlined text-error text-3xl">warning</span>
              <span class="text-[10px] font-black text-error uppercase tracking-widest">En Retard</span>
            </div>
            <div class="flex items-end gap-1 mb-1">
              <h3 class="text-3xl font-headline font-black text-error">{{ stats()!.fleet.en_retard }}</h3>
              <span class="text-outline text-xs font-bold pb-1.5">/ {{ (stats()!.fleet.jamais_controle || 0) + (stats()!.fleet.a_jour || 0) + (stats()!.fleet.bientot || 0) + (stats()!.fleet.en_retard || 0) }}</span>
            </div>
            <p class="text-outline/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Véhicules du portefeuille</p>
          </div>
        </section>

        <!-- OBJECTIFS KPI (Vue Grid 3 colonnes) -->
        <section class="bg-white rounded-[2.5rem] p-10 border border-outline-variant/10 shadow-sm">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
            <div>
              <h3 class="text-xl font-headline font-black text-on-surface">Objectifs & Cibles</h3>
              <p class="text-xs text-outline font-medium mt-1">Mensuel, Trimestriel et Annuel coexistent et se mesurent séparément.</p>
            </div>
            
            <!-- Filtres de Périodes de mesure -->
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex flex-col gap-1">
                <span class="text-[9px] font-black uppercase tracking-widest text-outline ml-1">Année</span>
                <input type="number" [(ngModel)]="periodYear" (ngModelChange)="reloadProgress()" class="h-11 w-28 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 text-sm font-black outline-none" />
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[9px] font-black uppercase tracking-widest text-outline ml-1">Mois</span>
                <select [(ngModel)]="periodMonth" (ngModelChange)="reloadProgress()" class="h-11 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 text-sm font-black outline-none">
                  <option *ngFor="let m of months" [ngValue]="m.value">{{ m.label }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[9px] font-black uppercase tracking-widest text-outline ml-1">Trimestre</span>
                <select [(ngModel)]="periodQuarter" (ngModelChange)="reloadProgress()" class="h-11 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 text-sm font-black outline-none">
                  <option [ngValue]="1">T1</option>
                  <option [ngValue]="2">T2</option>
                  <option [ngValue]="3">T3</option>
                  <option [ngValue]="4">T4</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Spinner chargement KPIs -->
          <div *ngIf="kpiLoading()" class="py-20 text-center text-outline">
            <span class="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
            <p class="text-sm font-medium mt-2">Chargement des objectifs…</p>
          </div>

          <!-- Grille d'objectifs -->
          <div *ngIf="!kpiLoading()" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- 1. CARTE MENSUELLE -->
            <ng-container *ngTemplateOutlet="kpiCard; context: { 
              title: 'Objectif Mensuel', 
              subtitle: getMonthLabel(), 
              progress: monthProgress(),
              type: 'month'
            }"></ng-container>

            <!-- 2. CARTE TRIMESTRIELLE -->
            <ng-container *ngTemplateOutlet="kpiCard; context: { 
              title: 'Objectif Trimestriel', 
              subtitle: 'Trimestre T' + periodQuarter + ' ' + periodYear, 
              progress: quarterProgress(),
              type: 'quarter'
            }"></ng-container>

            <!-- 3. CARTE ANNUELLE -->
            <ng-container *ngTemplateOutlet="kpiCard; context: { 
              title: 'Objectif Annuel', 
              subtitle: 'Année ' + periodYear, 
              progress: yearProgress(),
              type: 'year'
            }"></ng-container>
          </div>
        </section>

        <!-- Template réutilisable pour chaque carte KPI -->
        <ng-template #kpiCard let-title="title" let-subtitle="subtitle" let-p="progress" let-type="type">
          <div class="flex flex-col justify-between rounded-[2.5rem] p-8 border border-outline-variant/10 bg-surface-container-low shadow-sm hover:shadow-md transition-all">
            <div>
              <div class="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h4 class="text-md font-headline font-black text-on-surface">{{ title }}</h4>
                  <p class="text-[10px] text-primary font-black uppercase tracking-wider mt-0.5">{{ subtitle }}</p>
                </div>
                <span class="material-symbols-outlined text-outline/40">
                  {{ type === 'month' ? 'calendar_month' : type === 'quarter' ? 'analytics' : 'calendar_today' }}
                </span>
              </div>

              <!-- État Vide : Aucun objectif défini -->
              <div *ngIf="!p || (!p.target?.target_clients && !p.target?.target_revenue_signed)" class="py-8 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-white/50">
                <span class="material-symbols-outlined text-outline/30 text-3xl">info</span>
                <p class="text-xs text-outline font-bold mt-2">Aucun objectif défini</p>
                <p class="text-[9px] text-outline/60 mt-1 px-4">Aucune cible n'a été fixée pour cette période.</p>
              </div>

              <!-- Objectifs Définis -->
              <div *ngIf="p && (p.target?.target_clients || p.target?.target_revenue_signed)" class="space-y-6">
                <!-- Objectif Clients -->
                <div class="rounded-2xl p-4 border border-outline-variant/5 bg-white shadow-sm">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="text-[9px] font-black uppercase tracking-widest text-outline">Clients convertis</span>
                    <span *ngIf="p.target?.target_clients" class="text-xs font-headline font-black text-primary">{{ p.progress.clients_pct ?? 0 }}%</span>
                    <span *ngIf="!p.target?.target_clients" class="text-[9px] font-black uppercase text-outline/40">Non défini</span>
                  </div>

                  <div *ngIf="p.target?.target_clients" class="space-y-2">
                    <div class="flex items-end justify-between">
                      <p class="text-xl font-headline font-black text-on-surface">{{ p.actuals.clients }}</p>
                      <p class="text-[10px] text-outline font-medium">Cible: {{ p.target.target_clients }}</p>
                    </div>
                    <div class="h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div class="h-full bg-primary" [style.width.%]="p.progress.clients_pct ?? 0"></div>
                    </div>
                  </div>
                  
                  <div *ngIf="!p.target?.target_clients" class="py-2 text-center text-[10px] text-outline/40 font-medium italic">
                    Aucune cible client fixée
                  </div>
                </div>

                <!-- Objectif CA -->
                <div class="rounded-2xl p-4 border border-outline-variant/5 bg-white shadow-sm">
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="text-[9px] font-black uppercase tracking-widest text-outline">CA signé</span>
                    <span *ngIf="p.target?.target_revenue_signed" class="text-xs font-headline font-black text-primary">{{ p.progress.revenue_signed_pct ?? 0 }}%</span>
                    <span *ngIf="!p.target?.target_revenue_signed" class="text-[9px] font-black uppercase text-outline/40">Non défini</span>
                  </div>

                  <div *ngIf="p.target?.target_revenue_signed" class="space-y-2">
                    <div class="flex items-end justify-between">
                      <p class="text-xl font-headline font-black text-on-surface">{{ p.actuals.revenue_signed | currency:'XOF':'symbol':'1.0-0' }}</p>
                      <p class="text-[10px] text-outline font-medium">Cible: {{ p.target.target_revenue_signed | currency:'XOF':'symbol':'1.0-0' }}</p>
                    </div>
                    <div class="h-1.5 rounded-full bg-surface-container overflow-hidden">
                      <div class="h-full bg-primary" [style.width.%]="p.progress.revenue_signed_pct ?? 0"></div>
                    </div>
                  </div>

                  <div *ngIf="!p.target?.target_revenue_signed" class="py-2 text-center text-[10px] text-outline/40 font-medium italic">
                    Aucune cible CA fixée
                  </div>
                </div>
              </div>
            </div>

            <!-- Bouton Modifier (Admin seulement) -->
            <div *ngIf="isAdmin()" class="mt-8 pt-4 border-t border-outline-variant/10 flex justify-end">
              <button type="button" (click)="openTargetModal(type)" class="h-9 px-4 rounded-xl bg-[#1b1932] text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[12px]">edit</span>
                {{ p && (p.target?.target_clients || p.target?.target_revenue_signed) ? 'Modifier' : "Fixer l'objectif" }}
              </button>
            </div>
          </div>
        </ng-template>

        <!-- MODAL: Fixer / mettre à jour l’objectif (Admin) -->
        <div *ngIf="isAdmin() && showTargetModal()" class="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 py-10">
          <div class="absolute inset-0 bg-[#0f172a]/75 backdrop-blur-sm" (click)="closeTargetModal()"></div>
          <div class="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl border border-outline-variant/10 overflow-hidden animate-scale-in" (click)="$event.stopPropagation()">
            <!-- En-tête du modal -->
            <div class="p-8 border-b border-outline-variant/10 bg-white flex items-start justify-between gap-4">
              <div>
                <h3 class="text-2xl font-headline font-black text-on-surface mb-1">
                  {{ editPeriodType === 'month' ? 'Objectif Mensuel' : editPeriodType === 'quarter' ? 'Objectif Trimestriel' : 'Objectif Annuel' }}
                </h3>
                <p class="text-xs text-outline font-medium">{{ getEditPeriodLabel() }}</p>
              </div>
              <button type="button" (click)="closeTargetModal()" class="w-12 h-12 rounded-2xl bg-surface-container text-outline hover:bg-surface-container-high transition-all flex items-center justify-center">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>

            <!-- Contenu du modal -->
            <div class="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              <!-- Alerte : Objectif déjà en cours de réalisation -->
              <div *ngIf="hasExistingProgress()" class="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex gap-4 text-amber-800 animate-fade-in">
                <span class="material-symbols-outlined text-amber-600 text-3xl">warning</span>
                <div>
                  <h4 class="font-headline font-black text-xs">⚠️ Objectif en cours de réalisation !</h4>
                  <p class="text-[10px] font-medium text-amber-700/90 mt-1 leading-relaxed">
                    Ce commercial a déjà commencé à réaliser des performances pour cette période. Modifier cet objectif mettra à jour sa progression en temps réel.
                  </p>
                </div>
              </div>

              <!-- Paramétrage avec Toggles -->
              <div class="space-y-4">
                <!-- 1. Objectif Clients -->
                <div class="rounded-2xl bg-surface-container-low border border-outline-variant/10 p-5 space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="block text-[10px] font-black uppercase tracking-wider text-outline">Objectif de conversion clients</span>
                      <span class="block text-[9px] text-outline/60 mt-0.5">Activer une cible en nombre de clients convertis</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="enableClientsTarget" />
                      <span class="slider"></span>
                    </label>
                  </div>

                  <div *ngIf="enableClientsTarget" class="animate-fade-in">
                    <label class="block text-[9px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Nombre de clients visé</label>
                    <input type="number" min="0" [(ngModel)]="targetClients" class="w-full h-12 px-4 rounded-2xl bg-white border border-outline-variant/10 text-sm font-black outline-none focus:border-primary transition-all" />
                  </div>
                </div>

                <!-- 2. Objectif CA Signé -->
                <div class="rounded-2xl bg-surface-container-low border border-outline-variant/10 p-5 space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="block text-[10px] font-black uppercase tracking-wider text-outline">Objectif Chiffre d'Affaires</span>
                      <span class="block text-[9px] text-outline/60 mt-0.5">Activer une cible en chiffre d'affaires signé (FCFA)</span>
                    </div>
                    <label class="switch">
                      <input type="checkbox" [(ngModel)]="enableRevenueTarget" />
                      <span class="slider"></span>
                    </label>
                  </div>

                  <div *ngIf="enableRevenueTarget" class="animate-fade-in">
                    <label class="block text-[9px] font-black uppercase tracking-widest text-outline mb-1.5 ml-1">Montant CA visé (XOF)</label>
                    <input type="number" min="0" [(ngModel)]="targetRevenueSigned" class="w-full h-12 px-4 rounded-2xl bg-white border border-outline-variant/10 text-sm font-black outline-none focus:border-primary transition-all" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Pied de page du modal -->
            <div class="p-6 bg-surface-container-low border-t border-outline-variant/10 flex flex-col sm:flex-row gap-3 justify-end">
              <button type="button" (click)="closeTargetModal()" [disabled]="savingTargets()" class="h-11 px-6 rounded-2xl bg-white border border-outline-variant/20 text-on-surface text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
                Annuler
              </button>
              <button type="button" (click)="saveTargets()" [disabled]="savingTargets()" class="h-11 px-6 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-40 flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-sm" [class.animate-spin]="savingTargets()">sync</span>
                Enregistrer
              </button>
            </div>
          </div>
        </div>

        <!-- Activité Quotidienne & Export -->
        <section class="bg-surface-container-low rounded-[2.5rem] p-10 border border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 class="text-xl font-headline font-black text-on-surface">Activité Quotidienne</h3>
            <p class="text-xs text-outline font-medium mt-1">
              Devis en attente : {{ stats()!.revenue.new_quotes_count }} | Demandes entrantes (leads) non traitées : {{ stats()!.alerts.pending_requests }}
            </p>
          </div>
          <button
            type="button"
            (click)="exportRapport()"
            class="px-8 py-3 rounded-2xl bg-secondary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-secondary/20 hover:scale-105 transition-all">
            Exporter son rapport
          </button>
        </section>
      </ng-container>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #fbfbfd;
        height: 100%;
      }
      .animate-fade-in {
        animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .animate-scale-in {
        animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes scaleIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      /* Switch Toggle Stylisé */
      .switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }
      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e1;
        transition: .3s;
        border-radius: 24px;
      }
      .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      input:checked + .slider {
        background-color: var(--md-sys-color-primary, #6366f1);
      }
      input:checked + .slider:before {
        transform: translateX(20px);
      }
    `,
  ],
})
export class CommercialPerformanceComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  commercial = signal<User | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private commercialId: number | null = null;

  private dashboardService = inject(DashboardService);
  private teamService = inject(TeamService);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private kpiTargetService = inject(KpiTargetService);

  // KPI targets UI state
  months = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Fév' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Avr' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Juin' },
    { value: 7, label: 'Juil' }, { value: 8, label: 'Aoû' }, { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Déc' },
  ];
  
  periodYear = new Date().getFullYear();
  periodMonth = new Date().getMonth() + 1;
  periodQuarter = Math.floor(new Date().getMonth() / 3) + 1;

  kpiLoading = signal(false);
  
  // 3 signaux distincts pour stocker les 3 périodes
  monthProgress = signal<KpiProgressResponse | null>(null);
  quarterProgress = signal<KpiProgressResponse | null>(null);
  yearProgress = signal<KpiProgressResponse | null>(null);

  savingTargets = signal(false);
  targetClients = 0;
  targetRevenueSigned = 0;
  showTargetModal = signal(false);

  // Modal active targets properties
  editPeriodType: PeriodType = 'month';
  enableClientsTarget = false;
  enableRevenueTarget = false;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      const idParam = pm.get('id');
      if (!idParam) {
        this.loading.set(false);
        this.error.set('Identifiant collaborateur manquant.');
        return;
      }
      const id = +idParam;
      if (!Number.isFinite(id) || id < 1) {
        this.loading.set(false);
        this.error.set('Identifiant collaborateur invalide.');
        return;
      }
      this.commercialId = id;
      this.loadData(this.commercialId);
    });
  }

  retry(): void {
    if (this.commercialId != null) this.loadData(this.commercialId);
  }

  loadData(commercialId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.stats.set(null);
    this.commercial.set(null);

    forkJoin({
      commercial: this.teamService.getById(commercialId),
      stats: this.dashboardService.getStats(commercialId),
    }).subscribe({
      next: ({ commercial, stats }) => {
        this.commercial.set(commercial);
        this.stats.set(stats);
        this.loading.set(false);
        this.reloadProgress();
      },
      error: (err) => {
        this.loading.set(false);
        const status = err?.status;
        let msg = 'Une erreur est survenue lors du chargement.';
        if (status === 403) msg = "Vous n'avez pas accès aux performances de ce collaborateur.";
        if (status === 404) msg = 'Collaborateur introuvable ou non éligible.';
        this.error.set(msg);
        this.toastService.error(msg);
        console.error(err);
      },
    });
  }

  isAdmin(): boolean {
    return ['admin_commercial', 'super_admin'].includes(this.authService.getCurrentUser()?.role ?? '');
  }

  reloadProgress(): void {
    const cid = this.commercialId;
    if (!cid) return;
    this.kpiLoading.set(true);

    // ForkJoin pour charger les 3 objectifs en parallèle
    forkJoin({
      month: this.kpiTargetService.getProgress({
        commercial_id: cid,
        period_type: 'month',
        year: this.periodYear,
        month: this.periodMonth,
      }),
      quarter: this.kpiTargetService.getProgress({
        commercial_id: cid,
        period_type: 'quarter',
        year: this.periodYear,
        quarter: this.periodQuarter,
      }),
      year: this.kpiTargetService.getProgress({
        commercial_id: cid,
        period_type: 'year',
        year: this.periodYear,
      }),
    }).subscribe({
      next: (res) => {
        this.monthProgress.set(res.month);
        this.quarterProgress.set(res.quarter);
        this.yearProgress.set(res.year);
        this.kpiLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching KPI targets progress', err);
        this.monthProgress.set(null);
        this.quarterProgress.set(null);
        this.yearProgress.set(null);
        this.kpiLoading.set(false);
      },
    });
  }

  openTargetModal(type: PeriodType): void {
    this.editPeriodType = type;
    
    // Charger la progression existante pour cette période
    let progress: KpiProgressResponse | null = null;
    if (type === 'month') progress = this.monthProgress();
    else if (type === 'quarter') progress = this.quarterProgress();
    else if (type === 'year') progress = this.yearProgress();

    this.targetClients = progress?.target?.target_clients ?? 0;
    this.targetRevenueSigned = progress?.target?.target_revenue_signed ?? 0;

    // Configurer les toggles
    this.enableClientsTarget = this.targetClients > 0;
    this.enableRevenueTarget = this.targetRevenueSigned > 0;

    this.showTargetModal.set(true);
  }

  closeTargetModal(): void {
    if (this.savingTargets()) return;
    this.showTargetModal.set(false);
  }

  saveTargets(): void {
    const cid = this.commercialId;
    if (!cid) return;
    this.savingTargets.set(true);

    const tClients = this.enableClientsTarget ? Math.max(0, Number(this.targetClients || 0)) : 0;
    const tRevenue = this.enableRevenueTarget ? Math.max(0, Number(this.targetRevenueSigned || 0)) : 0;

    this.kpiTargetService.upsert({
      commercial_id: cid,
      period_type: this.editPeriodType,
      year: this.periodYear,
      month: this.editPeriodType === 'month' ? this.periodMonth : undefined,
      quarter: this.editPeriodType === 'quarter' ? this.periodQuarter : undefined,
      target_clients: tClients,
      target_revenue_signed: tRevenue,
    }).subscribe({
      next: () => {
        this.toastService.success('Objectifs enregistrés.');
        this.savingTargets.set(false);
        this.showTargetModal.set(false);
        this.reloadProgress();
      },
      error: () => {
        this.toastService.error('Erreur lors de l’enregistrement des objectifs.');
        this.savingTargets.set(false);
      },
    });
  }

  hasExistingProgress(): boolean {
    let p: KpiProgressResponse | null = null;
    if (this.editPeriodType === 'month') p = this.monthProgress();
    else if (this.editPeriodType === 'quarter') p = this.quarterProgress();
    else if (this.editPeriodType === 'year') p = this.yearProgress();

    if (!p) return false;
    return (p.actuals.clients > 0 || p.actuals.revenue_signed > 0);
  }

  getMonthLabel(): string {
    const m = this.months.find((x) => x.value === this.periodMonth);
    return (m ? m.label : '') + ' ' + this.periodYear;
  }

  getEditPeriodLabel(): string {
    if (this.editPeriodType === 'year') return `Année ${this.periodYear}`;
    if (this.editPeriodType === 'month') {
      const m = this.months.find((x) => x.value === this.periodMonth);
      return `Mois de ${m ? m.label : ''} ${this.periodYear}`;
    }
    return `Trimestre T${this.periodQuarter} ${this.periodYear}`;
  }

  exportRapport(): void {
    const s = this.stats();
    const c = this.commercial();
    if (!s || !c) return;
    const label = `${c.first_name} ${c.last_name}`.trim();
    openReportPreviewWindow({
      title: 'Rapport performances commercial',
      subject: label,
      meta: [{ label: 'Portefeuille', value: 'Clients + prospects rattachés' }],
      kpis: [
        { label: 'CA acceptés', value: `${s.revenue?.total_accepted ?? 0} XOF`, accent: 'brand' },
        { label: 'Flotte en retard', value: String(s.fleet?.en_retard ?? 0), accent: 'error' },
        { label: 'Taux conv.', value: `${s.crm?.conversion_rate ?? 0}%`, accent: 'neutral' },
      ],
      tableTitle: 'Indicateurs',
      columns: ['Indicateur', 'Valeur'],
      rows: [
        { label: 'Clients', value: String(s.crm?.total_clients ?? 0) },
        { label: 'Prospects', value: String(s.crm?.total_prospects ?? 0) },
        { label: 'Devis envoyés', value: String(s.revenue?.new_quotes_count ?? 0) },
        { label: 'Flotte à jour', value: String(s.fleet?.a_jour ?? 0) },
        { label: 'Flotte bientôt', value: String(s.fleet?.bientot ?? 0) },
        { label: 'Flotte en retard', value: String(s.fleet?.en_retard ?? 0), hint: 'Véhicules à relancer' },
        { label: 'Flotte jamais contrôlée', value: String(s.fleet?.jamais_controle ?? 0) },
        { label: 'Demandes devis en attente', value: String(s.alerts?.pending_requests ?? 0) },
      ],
    });
    const rows = buildDashboardStatsCsvRows(s, {
      title: 'Rapport performances commercial',
      subjectLabel: label,
    });
    const safe = label.replace(/\s+/g, '_').replace(/[^\w.-]/g, '') || 'commercial';
    downloadCsv(`performances_${safe}_${new Date().toISOString().slice(0, 10)}`, rows);
    this.toastService.success('Aperçu ouvert + CSV téléchargé.');
  }
}

