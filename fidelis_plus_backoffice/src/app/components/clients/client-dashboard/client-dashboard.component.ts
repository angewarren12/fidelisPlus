import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import * as QRCode from 'qrcode';
import { AuthService } from '../../../services/auth.service';
import { DashboardService, DashboardStats } from '../../../services/dashboard.service';
import { LoyaltyService } from '../../../services/loyalty.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- SKELETON LOADING -->
    <div *ngIf="loading()" class="space-y-10 pb-20 animate-pulse">
      <div class="h-14 w-2/3 bg-surface-container rounded-2xl"></div>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-5 h-72 bg-surface-container rounded-[2rem]"></div>
        <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div class="h-36 bg-surface-container rounded-[2rem]"></div>
          <div class="h-36 bg-surface-container rounded-[2rem]"></div>
          <div class="h-36 bg-surface-container rounded-[2rem]"></div>
        </div>
      </div>
    </div>

    <!-- ERROR STATE -->
    <div *ngIf="!loading() && error()" class="py-24 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-outline-variant/10">
      <span class="material-symbols-outlined text-error/40 text-6xl mb-4">cloud_off</span>
      <p class="text-on-surface font-bold text-lg mb-1">Impossible de charger votre tableau de bord</p>
      <p class="text-outline text-sm mb-6">Une erreur réseau est survenue. Vérifiez votre connexion et réessayez.</p>
      <button type="button" (click)="loadStats()" class="px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:brightness-110 transition-all flex items-center gap-2">
        <span class="material-symbols-outlined text-sm">refresh</span>
        Réessayer
      </button>
    </div>

    <div class="space-y-10 animate-fade-in pb-20" *ngIf="!loading() && !error() && stats()">

      <!-- GREETING -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-3xl md:text-5xl font-headline font-black text-on-surface tracking-tighter">
            Bonjour, <span class="text-primary">{{ currentUser()?.first_name }}</span> 👋
          </h1>
          <p class="text-outline text-sm font-medium mt-2">Bienvenue sur votre Espace Client Mayelia.</p>
        </div>
        <div class="px-4 py-2 bg-surface-container rounded-xl border border-outline-variant/10 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span class="text-[10px] font-black uppercase text-on-surface tracking-widest">{{ today | date:'dd MMMM yyyy' }}</span>
        </div>
      </section>

      <!-- METRICS & LOYALTY CARD -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- LOYALTY CARD (Bento Widget) -->
        <div class="lg:col-span-5 bg-gradient-to-br from-[#1a1831] to-[#2e2b54] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl flex flex-col justify-between min-h-[300px]">
          <div class="absolute top-0 right-0 w-48 h-48 bg-primary/20 rounded-full blur-[80px] -mr-16 -mt-16"></div>
          
          <div class="relative z-10 flex justify-between items-start">
            <div>
              <span class="material-symbols-outlined text-[#15b9a3] text-4xl" style="font-variation-settings: 'FILL' 1;">stars</span>
              <p class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mt-2">Carte Fidélité Mayelia</p>
            </div>
            <div class="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm">
              <span class="material-symbols-outlined text-xs">workspace_premium</span>
              Client Privilège
            </div>
          </div>
          
          <div class="relative z-10 my-6">
            <p class="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Votre Solde</p>
            <div class="flex items-baseline gap-2">
              <span class="text-5xl font-headline font-black text-white">{{ loyaltyBalance() }}</span>
              <span class="text-sm font-bold text-[#15b9a3]">Points</span>
            </div>
          </div>
          
          <div class="relative z-10 flex justify-between items-end border-t border-white/10 pt-6">
            <div>
              <p class="text-xs font-bold truncate max-w-[200px]">{{ currentUser()?.company?.name || (currentUser()?.first_name + ' ' + currentUser()?.last_name) }}</p>
              <p class="text-[9px] text-white/40 font-mono tracking-wider mt-0.5">ID: {{ loyaltyKey() === 'NON_ENREGISTRE' ? 'Non attribué' : loyaltyKey() }}</p>
            </div>
            
            <button (click)="toggleQr()" class="px-4 py-2 bg-[#15b9a3] hover:brightness-110 text-white text-xs font-bold rounded-xl active:scale-95 transition-all flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">qr_code_2</span>
              {{ showQr() ? 'Masquer QR' : 'Afficher QR' }}
            </button>
          </div>

          <!-- QR Overlay container -->
          <div *ngIf="showQr()" class="absolute inset-0 bg-[#1a1831] flex flex-col items-center justify-center p-6 z-25 transition-all duration-300">
            <p class="text-xs font-bold text-white/80 mb-4">Présentez ce QR code à la caisse</p>
            <div class="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center w-40 h-40">
              <img *ngIf="qrCodeUrl(); else noQr" [src]="qrCodeUrl()" alt="QR Code Fidélité" class="w-full h-full">
              <ng-template #noQr>
                <span class="text-outline text-[10px] font-bold text-center px-2">QR code indisponible</span>
              </ng-template>
            </div>
            <button (click)="toggleQr()" class="mt-6 text-xs text-[#15b9a3] font-bold hover:underline">Retour</button>
          </div>
        </div>

        <!-- FLEET STATUS WIDGETS -->
        <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          <!-- Card: À jour -->
          <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between min-h-[140px] border-l-4 border-l-primary">
            <div class="flex items-center justify-between">
              <span class="material-symbols-outlined text-primary text-3xl">task_alt</span>
              <span class="text-[10px] font-black text-primary uppercase tracking-widest">À Jour</span>
            </div>
            <div>
              <h3 class="text-4xl font-headline font-black text-on-surface">{{ stats()?.fleet?.a_jour }}</h3>
              <p class="text-outline text-[10px] font-black uppercase tracking-wider mt-1">Véhicules</p>
            </div>
          </div>

          <!-- Card: Bientôt -->
          <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between min-h-[140px] border-l-4 border-l-amber-500">
            <div class="flex items-center justify-between">
              <span class="material-symbols-outlined text-amber-500 text-3xl">hourglass_empty</span>
              <span class="text-[10px] font-black text-amber-500 uppercase tracking-widest">À inspecter</span>
            </div>
            <div>
              <h3 class="text-4xl font-headline font-black text-on-surface">{{ stats()?.fleet?.bientot }}</h3>
              <p class="text-outline text-[10px] font-black uppercase tracking-wider mt-1">Échéance proche</p>
            </div>
          </div>

          <!-- Card: En retard -->
          <div class="bg-white p-8 rounded-[2rem] border border-outline-variant/10 shadow-sm flex flex-col justify-between min-h-[140px] border-l-4 border-l-error">
            <div class="flex items-center justify-between">
              <span class="material-symbols-outlined text-error text-3xl">warning</span>
              <span class="text-[10px] font-black text-error uppercase tracking-widest">Retard</span>
            </div>
            <div>
              <h3 class="text-4xl font-headline font-black text-error">{{ stats()?.fleet?.en_retard }}</h3>
              <p class="text-outline text-[10px] font-black uppercase tracking-wider mt-1">Hors délai</p>
            </div>
          </div>

        </div>

      </section>

      <!-- COMPANY INFO -->
      <section *ngIf="currentUser()?.company as company" class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-outline-variant/5">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <span class="material-symbols-outlined">domain</span>
          </div>
          <div>
            <h3 class="text-lg font-headline font-black text-on-surface">Informations entreprise</h3>
            <p class="text-outline text-xs font-medium">Coordonnées associées à votre compte Mayelia</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div class="p-4 rounded-2xl bg-surface-container-low">
            <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Raison sociale</p>
            <p class="font-bold text-on-surface truncate">{{ company.name || '—' }}</p>
          </div>
          <div class="p-4 rounded-2xl bg-surface-container-low" *ngIf="company.rccm">
            <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Registre de Commerce (RCCM)</p>
            <p class="font-bold text-on-surface truncate">{{ company.rccm }}</p>
          </div>
          <div class="p-4 rounded-2xl bg-surface-container-low" *ngIf="company.phone">
            <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Téléphone</p>
            <p class="font-bold text-on-surface truncate">{{ company.phone }}</p>
          </div>
          <div class="p-4 rounded-2xl bg-surface-container-low" *ngIf="company.email">
            <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Email</p>
            <p class="font-bold text-on-surface truncate">{{ company.email }}</p>
          </div>
          <div class="p-4 rounded-2xl bg-surface-container-low" *ngIf="company.sector">
            <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Secteur</p>
            <p class="font-bold text-on-surface truncate">{{ company.sector }}</p>
          </div>
          <div class="p-4 rounded-2xl bg-surface-container-low sm:col-span-2" *ngIf="company.address || company.city">
            <p class="text-[9px] font-black uppercase text-outline tracking-widest mb-1">Adresse</p>
            <p class="font-bold text-on-surface">
              {{ company.address || '' }}<span *ngIf="company.address && (company.city || company.zip_code)">, </span>{{ company.zip_code || '' }} {{ company.city || '' }}
            </p>
          </div>
        </div>
      </section>

      <!-- RECENT QUOTES -->
      <div class="grid grid-cols-1 gap-8">
        <section class="bg-white rounded-[2.5rem] p-8 shadow-sm border border-outline-variant/5">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-lg font-headline font-black text-on-surface">Derniers Devis</h3>
            <button routerLink="/client/quotes" class="text-xs text-primary font-bold hover:underline flex items-center gap-1">
              Voir tout
              <span class="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>

          <div class="space-y-4">
            <div *ngFor="let quote of stats()?.recent_quotes" class="p-4 rounded-xl border border-outline-variant/5 hover:border-primary/10 transition-colors flex items-center justify-between">
              <div>
                <p class="text-sm font-bold text-on-surface">Devis n° {{ quote.quote_number }}</p>
                <p class="text-xs text-outline mt-0.5">Montant : {{ quote.total_amount | currency:'XOF':'symbol':'1.0-2' }} • Expire le : {{ quote.valid_until | date:'shortDate' }}</p>
              </div>
              <div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      [ngClass]="{
                        'bg-teal-50 text-primary': quote.status === 'accepted',
                        'bg-amber-50 text-amber-600': quote.status === 'sent' || quote.status === 'draft',
                        'bg-red-50 text-error': quote.status === 'declined'
                      }">
                  {{ quote.status === 'accepted' ? 'Accepté' : (quote.status === 'declined' ? 'Rejeté' : 'En cours') }}
                </span>
              </div>
            </div>

            <div *ngIf="!stats()?.recent_quotes?.length" class="py-12 flex flex-col items-center justify-center bg-surface-container text-outline/30 rounded-2xl italic">
              <span class="material-symbols-outlined text-4xl mb-2">payments</span>
              Aucun devis disponible.
            </div>
          </div>
        </section>

      </div>

    </div>
  `,
  styles: [`
    :host { display: block; background: #fbfbfd; min-height: 100vh; }
    .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class ClientDashboardComponent implements OnInit {
  stats = signal<DashboardStats | null>(null);
  showQr = signal(false);
  loading = signal(true);
  error = signal(false);
  today = new Date();

  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);
  private loyaltyService = inject(LoyaltyService);
  private toastService = inject(ToastService);

  currentUser = computed(() => this.authService.getCurrentUser());

  // Extrait l'affichage du compte fidélité
  loyaltyBalance = computed(() => {
    const user = this.currentUser();
    if (!user) return 0;
    // Si lié à une entreprise
    if (user.company?.loyalty_accounts && user.company.loyalty_accounts.length > 0) {
      return user.company.loyalty_accounts[0].points_balance;
    }
    // Si lié au particulier
    if (user.loyalty_accounts && user.loyalty_accounts.length > 0) {
      return user.loyalty_accounts[0].points_balance;
    }
    return 0;
  });

  loyaltyKey = computed(() => {
    const user = this.currentUser();
    if (!user) return '—';
    if (user.company?.loyalty_accounts && user.company.loyalty_accounts.length > 0) {
      return user.company.loyalty_accounts[0].holder_key;
    }
    if (user.loyalty_accounts && user.loyalty_accounts.length > 0) {
      return user.loyalty_accounts[0].holder_key;
    }
    return 'NON_ENREGISTRE';
  });

  qrCodeUrl = signal<string>('');

  private loyaltyUuid = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    if (user.company?.loyalty_accounts && user.company.loyalty_accounts.length > 0) {
      return user.company.loyalty_accounts[0].public_uuid;
    }
    if (user.loyalty_accounts && user.loyalty_accounts.length > 0) {
      return user.loyalty_accounts[0].public_uuid;
    }
    return '';
  });

  private qrEffect = effect(() => {
    const uuid = this.loyaltyUuid();
    if (!uuid) {
      this.qrCodeUrl.set('');
      return;
    }
    // Génération locale : aucune donnée client n'est envoyée à un service tiers.
    QRCode.toDataURL(uuid, { width: 200, margin: 1 })
      .then(dataUrl => this.qrCodeUrl.set(dataUrl))
      .catch(() => this.qrCodeUrl.set(''));
  });

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set(false);
    this.dashboardService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Stats client error', err);
        this.loading.set(false);
        this.error.set(true);
        this.toastService.error('Impossible de charger votre tableau de bord client.');
      }
    });
  }

  toggleQr() {
    this.showQr.set(!this.showQr());
  }
}
