import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LoyaltyService, MarketingDashboardStats } from '../../../services/loyalty.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { MarketingBgPatternComponent } from '../../ui/marketing-bg-pattern/marketing-bg-pattern.component';

@Component({
  selector: 'app-marketing-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MarketingBgPatternComponent],
  template: `
    <app-marketing-bg-pattern></app-marketing-bg-pattern>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 sm:py-10 space-y-8 relative z-[1] animate-fade-in">

      <!-- HEADER -->
      <header class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm">
        <div class="flex items-center gap-5">
          <div class="relative">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-lg shadow-primary/20">
              <img *ngIf="currentUser()?.avatar_url" [src]="currentUser()?.avatar_url" class="w-full h-full rounded-[0.9rem] object-cover">
              <div *ngIf="!currentUser()?.avatar_url" class="w-full h-full rounded-[0.9rem] bg-surface-container-high flex items-center justify-center text-primary font-black text-xl">
                {{ (currentUser()?.first_name?.charAt(0) || 'M') }}
              </div>
            </div>
            <span class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center" title="En ligne">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </span>
          </div>
          <div>
            <div class="flex items-center gap-2.5 mb-1">
              <span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">Espace Marketing & Fidélité</span>
              <span class="hidden sm:inline-block text-xs font-semibold text-outline/60">• Mayelia Mobility</span>
            </div>
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-headline font-black text-on-surface tracking-tight">
              Bonjour, {{ currentUser()?.first_name || 'Marketing' }} 👋
            </h1>
            <p class="text-outline text-xs sm:text-sm font-medium mt-1">Supervision globale du programme de fidélité et activité des stations.</p>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="refresh()" [disabled]="loading()"
                  class="h-12 px-6 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 shadow-sm text-xs font-black uppercase tracking-widest text-on-surface hover:text-primary transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95">
            <span class="material-symbols-outlined text-base" [class.animate-spin]="loading()">refresh</span>
            <span>Actualiser</span>
          </button>
        </div>
      </header>

      <!-- SKELETON -->
      <div *ngIf="loading() && !stats()" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="h-52 rounded-[2.5rem] bg-white/60 animate-pulse"></div>
        <div class="h-52 rounded-[2.5rem] bg-white/60 animate-pulse"></div>
        <div class="h-52 rounded-[2.5rem] bg-white/60 animate-pulse"></div>
      </div>

      <!-- ERROR -->
      <div *ngIf="!loading() && error()" class="bg-white rounded-[2.5rem] border border-error/20 p-12 text-center space-y-4 shadow-xl shadow-error/5">
        <div class="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto">
          <span class="material-symbols-outlined text-3xl">wifi_off</span>
        </div>
        <h3 class="text-lg font-headline font-extrabold text-on-surface">Impossible de charger les données marketing</h3>
        <p class="text-xs text-outline max-w-md mx-auto">Une erreur réseau est survenue. Vérifiez votre connexion puis réessayez.</p>
        <button (click)="refresh()" class="px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
          Réessayer
        </button>
      </div>

      <ng-container *ngIf="!loading() && stats() as s">

        <!-- HERO CARDS GRID -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- MAIN HERO: COMPTES FIDÉLITÉ -->
          <div class="lg:col-span-2 relative overflow-hidden rounded-[2.5rem] p-8 sm:p-10 text-white bg-gradient-to-br from-[#15b9a3] via-[#0b8e7c] to-[#046656] shadow-xl shadow-primary/20 flex flex-col justify-between group">
            <!-- Decorative Glow Elements -->
            <div class="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl group-hover:bg-white/15 transition-all duration-700"></div>
            <div class="absolute -bottom-24 -left-16 w-60 h-60 rounded-full bg-[#003a32]/40 blur-3xl"></div>
            
            <div class="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  <p class="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Comptes Fidélité Actifs</p>
                </div>
                <div class="flex items-baseline gap-3">
                  <p class="text-5xl sm:text-6xl font-headline font-black tracking-tight leading-none">{{ s.accounts.total }}</p>
                  <span class="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md">
                    Total membres
                  </span>
                </div>
                
                <div class="flex flex-wrap items-center gap-6 pt-2 text-xs font-bold">
                  <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
                    <span class="w-2.5 h-2.5 rounded-full bg-white"></span>
                    <span>{{ s.accounts.particulier }} Particuliers ({{ segmentPct(s.accounts.particulier, s.accounts.total) | number:'1.0-0' }}%)</span>
                  </div>
                  <div class="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-200"></span>
                    <span>{{ s.accounts.entreprise }} Entreprises ({{ segmentPct(s.accounts.entreprise, s.accounts.total) | number:'1.0-0' }}%)</span>
                  </div>
                </div>

                <!-- Progress Segmented Bar -->
                <div class="h-2.5 w-full rounded-full bg-black/20 overflow-hidden flex p-0.5 gap-0.5">
                  <div class="h-full rounded-full bg-white transition-all duration-1000 shadow-sm" [style.width.%]="segmentPct(s.accounts.particulier, s.accounts.total)"></div>
                  <div class="h-full rounded-full bg-emerald-200 transition-all duration-1000 shadow-sm" [style.width.%]="segmentPct(s.accounts.entreprise, s.accounts.total)"></div>
                </div>
              </div>

              <div class="text-left md:text-right space-y-3 shrink-0 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">Points en circulation</p>
                <p class="text-3xl font-headline font-black text-amber-300 drop-shadow-sm">{{ s.points_in_circulation | number:'1.0-0' }} <span class="text-xs font-bold text-white/80">pts</span></p>
                <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}"
                   class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary text-[11px] font-black uppercase tracking-widest hover:bg-surface-container transition-all shadow-md active:scale-95 no-underline mt-2">
                  <span>Gérer les comptes</span>
                  <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>

          <!-- WEEK SCANS CARD -->
          <div class="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8 flex flex-col justify-between hover:border-primary/30 transition-all">
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Activité 7 Derniers Jours</p>
                <span class="material-symbols-outlined text-primary text-xl">auto_graph</span>
              </div>
              <div class="flex items-baseline gap-2">
                <p class="text-4xl font-headline font-black text-on-surface">{{ s.week.scans_count }}</p>
                <p class="text-xs font-bold text-outline">passages en station</p>
              </div>
              <div class="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-extrabold">
                <span class="material-symbols-outlined text-xs">add_circle</span>
                <span>+{{ s.week.points_credited | number:'1.0-0' }} pts crédités</span>
              </div>
            </div>

            <!-- Graphique Barres Horizontales / Verticales -->
            <div class="flex items-end gap-2 h-24 mt-6">
              <div *ngFor="let d of weekBars(s.week.by_day)" class="flex-1 flex flex-col items-center justify-end gap-1.5 group h-full">
                <span class="text-[9px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">{{ d.count }}</span>
                <div class="w-full rounded-t-lg bg-gradient-to-t from-primary/20 to-primary group-hover:brightness-110 transition-all shadow-sm"
                     [style.height.%]="d.pct"
                     [title]="d.count + ' passage(s)'"></div>
                <span class="text-[9px] font-black text-outline uppercase">{{ d.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LIGNE 2 : Demandes & Stock & Top Stations -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- DEMANDES À TRAITER -->
          <div class="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8 space-y-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Traitements en Attente</p>
                </div>
                <span *ngIf="totalPending(s) > 0" class="px-3 py-1 rounded-full bg-error text-white text-[10px] font-black shadow-md shadow-error/20 animate-pulse">
                  {{ totalPending(s) }} Action{{ totalPending(s) > 1 ? 's' : '' }}
                </span>
              </div>

              <div class="space-y-3">
                <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'requests'}"
                   class="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/5 transition-all group no-underline">
                  <span class="flex items-center gap-3 text-sm font-extrabold text-on-surface">
                    <span class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-sm">
                      <span class="material-symbols-outlined text-lg">inbox</span>
                    </span>
                    <span>Demandes Cartes SIRA</span>
                  </span>
                  <span class="px-3 py-1 rounded-xl text-xs font-black"
                        [class]="s.pending.member_requests > 0 ? 'bg-amber-500 text-white shadow-sm' : 'bg-surface-container text-outline'">
                    {{ s.pending.member_requests }}
                  </span>
                </a>

                <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'redemptions'}"
                   class="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/5 transition-all group no-underline">
                  <span class="flex items-center gap-3 text-sm font-extrabold text-on-surface">
                    <span class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm">
                      <span class="material-symbols-outlined text-lg">redeem</span>
                    </span>
                    <span>Récompenses à Livrer</span>
                  </span>
                  <span class="px-3 py-1 rounded-xl text-xs font-black"
                        [class]="s.pending.redemptions > 0 ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-outline'">
                    {{ s.pending.redemptions }}
                  </span>
                </a>

                <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}"
                   class="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/5 transition-all group no-underline">
                  <span class="flex items-center gap-3 text-sm font-extrabold text-on-surface">
                    <span class="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0 shadow-sm">
                      <span class="material-symbols-outlined text-lg">sync_problem</span>
                    </span>
                    <span>Erreurs Provisioning SIRA</span>
                  </span>
                  <span class="px-3 py-1 rounded-xl text-xs font-black"
                        [class]="s.pending.sira_failed > 0 ? 'bg-error text-white shadow-sm' : 'bg-surface-container text-outline'">
                    {{ s.pending.sira_failed }}
                  </span>
                </a>
              </div>
            </div>
          </div>

          <!-- STUDIO CARTES & STOCK -->
          <div class="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8 space-y-6 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Stock & Impression Cartes</p>
                <span class="material-symbols-outlined text-primary text-xl">badge</span>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5 flex flex-col justify-between space-y-2">
                  <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span class="material-symbols-outlined text-lg">style</span>
                  </div>
                  <div>
                    <p class="text-3xl font-headline font-black text-on-surface">{{ s.card_stock.blank_available }}</p>
                    <p class="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">Cartes vierges</p>
                  </div>
                </div>

                <div class="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5 flex flex-col justify-between space-y-2">
                  <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <span class="material-symbols-outlined text-lg">print</span>
                  </div>
                  <div>
                    <p class="text-3xl font-headline font-black text-on-surface">{{ s.card_stock.batches_to_print }}</p>
                    <p class="text-[11px] font-bold text-outline uppercase tracking-wider mt-0.5">Lots à imprimer</p>
                  </div>
                </div>
              </div>
            </div>

            <a routerLink="/marketing/studio-carte"
               class="w-full h-12 rounded-2xl bg-[#1a1831] hover:bg-[#2a2745] text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:brightness-110 active:scale-95 transition-all no-underline">
              <span class="material-symbols-outlined text-base">style</span>
              <span>Ouvrir Studio Cartes 3D</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <!-- TOP STATIONS DES PASSEMENTS -->
          <div class="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8 space-y-5 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Top Stations (7 jours)</p>
                <span class="material-symbols-outlined text-primary text-xl">local_gas_station</span>
              </div>

              <div *ngIf="s.top_stations.length === 0" class="py-10 text-center text-outline text-xs italic">
                Aucun passage enregistré en station cette semaine.
              </div>

              <div class="space-y-3">
                <div *ngFor="let st of s.top_stations; let i = index" 
                     class="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low/60 border border-outline-variant/5">
                  <span class="w-7 h-7 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
                    {{ i + 1 }}
                  </span>
                  <span class="flex-1 text-sm font-extrabold text-on-surface truncate">{{ st.station_name }}</span>
                  <span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                    {{ st.scans_count }} scans
                  </span>
                </div>
              </div>
            </div>

            <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'reports'}"
               class="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary hover:text-secondary transition-colors pt-2 no-underline">
              <span>Voir le rapport complet des stations</span>
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>
        </div>

        <!-- RUBAN D'ACTIONS RAPIDES (QUICK ACTION RIBBON) -->
        <div class="space-y-3 pt-4">
          <p class="text-[11px] font-black uppercase tracking-[0.2em] text-outline ml-1">Raccourcis & Actions Rapides</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}" class="quick-link group">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-2xl">person_add</span>
              </div>
              <div>
                <span class="text-sm font-headline font-black text-on-surface block">Nouveau Client</span>
                <span class="text-xs font-medium text-outline">Créer au guichet</span>
              </div>
            </a>

            <a routerLink="/marketing/studio-carte" class="quick-link group">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-2xl">badge</span>
              </div>
              <div>
                <span class="text-sm font-headline font-black text-on-surface block">Studio Cartes 3D</span>
                <span class="text-xs font-medium text-outline">Impression & visuels</span>
              </div>
            </a>

            <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'rewards'}" class="quick-link group">
              <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-2xl">card_giftcard</span>
              </div>
              <div>
                <span class="text-sm font-headline font-black text-on-surface block">Catalogue Récompenses</span>
                <span class="text-xs font-medium text-outline">{{ s.active_rewards }} offre(s) active(s)</span>
              </div>
            </a>

            <a routerLink="/marketing/scanner" class="quick-link group">
              <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-2xl">qr_code_scanner</span>
              </div>
              <div>
                <span class="text-sm font-headline font-black text-on-surface block">Scanner QR Code</span>
                <span class="text-xs font-medium text-outline">Test direct station</span>
              </div>
            </a>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .quick-link {
      display: flex; align-items: center; gap: 1rem;
      padding: 1.25rem; border-radius: 1.75rem; background: #ffffff;
      border: 1px solid rgba(0,0,0,0.06); text-decoration: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .quick-link:hover {
      border-color: rgba(21,185,163,0.3);
      box-shadow: 0 8px 24px rgba(21,185,163,0.12);
      transform: translateY(-2px);
    }
  `],
})
export class MarketingDashboardComponent implements OnInit {
  private loyaltyService = inject(LoyaltyService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  stats = signal<MarketingDashboardStats | null>(null);
  loading = signal(true);
  error = signal(false);

  currentUser = signal(this.authService.getCurrentUser());

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set(false);
    this.loyaltyService.dashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.toastService.error('Impossible de charger le tableau de bord marketing.');
      },
    });
  }

  segmentPct(part: number, total: number): number {
    return total > 0 ? (part / total) * 100 : 0;
  }

  totalPending(s: MarketingDashboardStats): number {
    return s.pending.member_requests + s.pending.redemptions + s.pending.sira_failed;
  }

  /** Complète à 7 jours (même si l'API ne renvoie que les jours avec activité) et calcule les hauteurs relatives. */
  weekBars(byDay: { day: string; scans_count: number }[]): { label: string; count: number; pct: number }[] {
    const map = new Map(byDay.map((d) => [d.day, d.scans_count]));
    const max = Math.max(1, ...byDay.map((d) => d.scans_count));
    const days: { label: string; count: number; pct: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = map.get(key) ?? 0;
      days.push({
        label: d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 1).toUpperCase(),
        count,
        pct: Math.max(4, (count / max) * 100),
      });
    }
    return days;
  }
}
