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
    <div class="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-8 relative z-[1] animate-fade-in">

      <!-- HEADER -->
      <header class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex items-center gap-4">
          <img *ngIf="currentUser()?.avatar_url" [src]="currentUser()?.avatar_url" class="w-14 h-14 rounded-2xl object-cover hidden sm:block">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-1">Espace marketing</p>
            <h1 class="text-3xl md:text-4xl font-headline font-black text-on-surface tracking-tight">
              Bonjour, {{ currentUser()?.first_name || 'Marketing' }}
            </h1>
            <p class="text-outline text-sm font-medium mt-1">Vue d'ensemble du programme de fidélité Mayelia.</p>
          </div>
        </div>
        <button (click)="refresh()" [disabled]="loading()"
                class="h-11 px-5 rounded-2xl bg-white border border-outline-variant/15 shadow-sm text-xs font-black uppercase tracking-widest text-outline hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-50">
          <span class="material-symbols-outlined text-sm" [class.animate-spin]="loading()">refresh</span>
          Actualiser
        </button>
      </header>

      <!-- SKELETON -->
      <div *ngIf="loading() && !stats()" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="h-44 rounded-[2rem] bg-white/60 animate-pulse"></div>
        <div class="h-44 rounded-[2rem] bg-white/60 animate-pulse"></div>
        <div class="h-44 rounded-[2rem] bg-white/60 animate-pulse"></div>
      </div>

      <!-- ERROR -->
      <div *ngIf="!loading() && error()" class="bg-white rounded-[2rem] border border-error/20 p-10 text-center space-y-3">
        <span class="material-symbols-outlined text-4xl text-error">error</span>
        <p class="text-sm font-bold text-on-surface">Impossible de charger le tableau de bord.</p>
        <button (click)="refresh()" class="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest">Réessayer</button>
      </div>

      <ng-container *ngIf="!loading() && stats() as s">

        <!-- HERO : comptes fidélité -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 relative overflow-hidden rounded-[2rem] p-8 md:p-10 text-white bg-gradient-to-br from-[#15b9a3] to-[#046656] shadow-lg shadow-primary/20">
            <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl"></div>
            <div class="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-[#003a32]/40 blur-2xl"></div>
            <div class="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2">Comptes fidélité actifs</p>
                <p class="text-5xl font-headline font-black">{{ s.accounts.total }}</p>
                <div class="flex items-center gap-5 mt-5 text-xs font-bold">
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-white"></span>{{ s.accounts.particulier }} particulier{{ s.accounts.particulier > 1 ? 's' : '' }}</span>
                  <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-white/50"></span>{{ s.accounts.entreprise }} entreprise{{ s.accounts.entreprise > 1 ? 's' : '' }}</span>
                </div>
                <!-- Barre segmentée FID-/ENT- -->
                <div class="mt-3 h-2 w-56 max-w-full rounded-full bg-white/20 overflow-hidden flex">
                  <div class="h-full bg-white" [style.width.%]="segmentPct(s.accounts.particulier, s.accounts.total)"></div>
                  <div class="h-full bg-white/50" [style.width.%]="segmentPct(s.accounts.entreprise, s.accounts.total)"></div>
                </div>
              </div>
              <div class="text-left md:text-right">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Points en circulation</p>
                <p class="text-3xl font-headline font-black">{{ s.points_in_circulation | number:'1.0-0' }}</p>
                <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}" class="inline-flex items-center gap-1 mt-3 text-[11px] font-black uppercase tracking-widest text-white/90 hover:text-white">
                  Voir les comptes <span class="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Semaine : scans -->
          <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8 flex flex-col">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-1">7 derniers jours</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-headline font-black text-on-surface">{{ s.week.scans_count }}</p>
              <p class="text-xs font-bold text-outline">passages</p>
            </div>
            <p class="text-xs font-bold text-primary mt-0.5">+{{ s.week.points_credited | number:'1.0-0' }} pts distribués</p>
            <!-- Mini barres -->
            <div class="flex items-end gap-1.5 h-16 mt-5 flex-1">
              <div *ngFor="let d of weekBars(s.week.by_day)" class="flex-1 flex flex-col items-center justify-end gap-1 group">
                <div class="w-full rounded-t-md bg-primary/15 group-hover:bg-primary/30 transition-colors" [style.height.%]="d.pct" [title]="d.count + ' scan(s)'"></div>
                <span class="text-[8px] font-bold text-outline/70 uppercase">{{ d.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LIGNE 2 : à traiter / stock cartes / top stations -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <!-- À TRAITER -->
          <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8 space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">À traiter</p>
              <span *ngIf="totalPending(s) > 0" class="w-6 h-6 rounded-full bg-error text-white text-[10px] font-black flex items-center justify-center">{{ totalPending(s) }}</span>
            </div>

            <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'requests'}"
               class="flex items-center justify-between p-3.5 rounded-2xl hover:bg-surface-container-low transition-colors group">
              <span class="flex items-center gap-3 text-sm font-bold text-on-surface">
                <span class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><span class="material-symbols-outlined text-lg">inbox</span></span>
                Demandes SIRA
              </span>
              <span class="text-sm font-black" [class.text-error]="s.pending.member_requests > 0" [class.text-outline]="s.pending.member_requests === 0">{{ s.pending.member_requests }}</span>
            </a>

            <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'redemptions'}"
               class="flex items-center justify-between p-3.5 rounded-2xl hover:bg-surface-container-low transition-colors group">
              <span class="flex items-center gap-3 text-sm font-bold text-on-surface">
                <span class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><span class="material-symbols-outlined text-lg">redeem</span></span>
                Lots à livrer
              </span>
              <span class="text-sm font-black" [class.text-error]="s.pending.redemptions > 0" [class.text-outline]="s.pending.redemptions === 0">{{ s.pending.redemptions }}</span>
            </a>

            <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}"
               class="flex items-center justify-between p-3.5 rounded-2xl hover:bg-surface-container-low transition-colors group">
              <span class="flex items-center gap-3 text-sm font-bold text-on-surface">
                <span class="w-9 h-9 rounded-xl bg-error/10 text-error flex items-center justify-center"><span class="material-symbols-outlined text-lg">sync_problem</span></span>
                Provisioning SIRA échoué
              </span>
              <span class="text-sm font-black" [class.text-error]="s.pending.sira_failed > 0" [class.text-outline]="s.pending.sira_failed === 0">{{ s.pending.sira_failed }}</span>
            </a>
          </div>

          <!-- STOCK CARTES -->
          <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8 space-y-5">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Studio Cartes</p>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined">badge</span>
              </div>
              <div>
                <p class="text-2xl font-headline font-black text-on-surface">{{ s.card_stock.blank_available }}</p>
                <p class="text-xs font-bold text-outline">carte{{ s.card_stock.blank_available > 1 ? 's' : '' }} vierge{{ s.card_stock.blank_available > 1 ? 's' : '' }} en stock</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined">print</span>
              </div>
              <div>
                <p class="text-2xl font-headline font-black text-on-surface">{{ s.card_stock.batches_to_print }}</p>
                <p class="text-xs font-bold text-outline">lot{{ s.card_stock.batches_to_print > 1 ? 's' : '' }} à imprimer</p>
              </div>
            </div>
            <a routerLink="/marketing/studio-carte"
               class="w-full h-11 rounded-xl bg-[#1b1932] text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all">
              Ouvrir Studio Cartes <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>

          <!-- TOP STATIONS -->
          <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8 space-y-4">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Top stations · 7 jours</p>
            <div *ngIf="s.top_stations.length === 0" class="py-8 text-center text-outline text-xs italic">Aucun passage cette semaine.</div>
            <div *ngFor="let st of s.top_stations; let i = index" class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-lg bg-surface-container-low flex items-center justify-center text-[10px] font-black text-outline shrink-0">{{ i + 1 }}</span>
              <span class="flex-1 text-sm font-bold text-on-surface truncate">{{ st.station_name }}</span>
              <span class="text-xs font-black text-primary shrink-0">{{ st.scans_count }}</span>
            </div>
            <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'reports'}"
               class="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-primary hover:underline pt-2">
              Voir l'analytics complet <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          </div>
        </div>

        <!-- ACCÈS RAPIDES -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}" class="quick-link">
            <span class="material-symbols-outlined text-primary text-2xl">person_add</span>
            <span>Nouveau client</span>
          </a>
          <a routerLink="/marketing/studio-carte" class="quick-link">
            <span class="material-symbols-outlined text-primary text-2xl">badge</span>
            <span>Studio Cartes</span>
          </a>
          <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'rewards'}" class="quick-link">
            <span class="material-symbols-outlined text-primary text-2xl">card_giftcard</span>
            <span>Catalogue ({{ s.active_rewards }})</span>
          </a>
          <a routerLink="/marketing/fidelite" [queryParams]="{tab: 'reminders'}" class="quick-link">
            <span class="material-symbols-outlined text-primary text-2xl">build_circle</span>
            <span>Rappels CT</span>
          </a>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s ease-out both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .quick-link {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem;
      padding: 1.25rem; border-radius: 1.5rem; background: #fff;
      border: 1px solid rgba(0,0,0,0.06); font-size: 0.75rem; font-weight: 800;
      color: #4b5b56; transition: all 0.15s ease;
    }
    .quick-link:hover { border-color: rgba(21,185,163,0.4); box-shadow: 0 4px 14px rgba(21,185,163,0.12); }
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
