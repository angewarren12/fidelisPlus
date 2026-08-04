import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LayoutService } from '../../../services/layout.service';
import { ToastService } from '../../../services/toast.service';
import { User } from '../../../models/auth.model';
import { ROLE_LABELS, UserRoles } from '../../../models/user-roles';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Overlay mobile : ferme la sidebar au clic en dehors -->
    <div *ngIf="layoutService.sidebarOpen()"
         (click)="layoutService.closeSidebar()"
         class="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
         aria-hidden="true">
    </div>

    <aside [ngClass]="layoutService.sidebarOpen() ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
           aria-label="Navigation principale"
           class="bg-[#1a1831] h-screen w-64 fixed left-0 top-0 overflow-y-auto flex flex-col py-6 shadow-xl z-50 transition-transform duration-300 ease-out">
      <div class="px-6 mb-10 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#15b9a3] to-[#006b5d] flex items-center justify-center">
            <span class="material-symbols-outlined text-white" style="font-variation-settings: 'FILL' 1;" aria-hidden="true">precision_manufacturing</span>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white tracking-tight">Mayelia CRM</h1>
            <p class="text-[11px] text-slate-300 font-medium uppercase tracking-[0.2em]">Gestion Commerciale</p>
          </div>
        </div>
        <button (click)="layoutService.closeSidebar()" aria-label="Fermer le menu" class="lg:hidden text-slate-400 hover:text-white p-1">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <nav class="flex-1 space-y-0.5 overflow-y-auto" aria-label="Sections" (click)="onNavClick()">
        <!-- ESPACE CLIENT -->
        <p *ngIf="showClientNav" class="px-6 pt-1 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Mon espace</p>
        <a *ngIf="showClientNav" routerLink="/client/dashboard" [routerLinkActiveOptions]="{exact: true}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">dashboard</span>
          Tableau de bord
        </a>
        <a *ngIf="showClientNav" routerLink="/client/fleet" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">directions_car</span>
          Ma Flotte
        </a>
        <a *ngIf="showClientNav" routerLink="/client/quotes" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">request_quote</span>
          Mes Devis
        </a>
        <a *ngIf="showClientNav" routerLink="/client/support" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">support_agent</span>
          Support
        </a>
        <a *ngIf="showClientNav" routerLink="/client/profile" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">person</span>
          Mon Profil
        </a>

        <!-- CRM -->
        <p *ngIf="showCrmNav" class="px-6 pt-1 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Commercial</p>
        <a *ngIf="showCrmNav" routerLink="/dashboard" [routerLinkActiveOptions]="{exact: true}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">dashboard</span>
          Dashboard
        </a>
        <a *ngIf="showClientsNav" routerLink="/clients" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">group</span>
          Clients & Contacts
        </a>
        <a *ngIf="showCrmNav" routerLink="/prospection" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">analytics</span>
          Prospection
        </a>
        <a *ngIf="showCrmNav" routerLink="/vente" [routerLinkActiveOptions]="{exact: true}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">receipt_long</span>
          Devis
        </a>
        <a *ngIf="showCrmNav" routerLink="/vente/rappels" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          FidelisPlus
        </a>
        <a *ngIf="showCrmNav" routerLink="/fleet" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">directions_car</span>
          Flotte
        </a>
        <a *ngIf="showStaffNav" routerLink="/equipe" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">supervisor_account</span>
          Équipe
        </a>

        <!-- FIDÉLITÉ -->
        <p *ngIf="showLoyaltyReadNav" class="px-6 pt-5 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Fidélité</p>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/dashboard" [routerLinkActiveOptions]="{exact: true}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">dashboard</span>
          Tableau de bord
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">card_giftcard</span>
          Comptes Fidélité
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'requests'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">inbox</span>
          Demandes SIRA
        </a>
        <a *ngIf="showLoyaltyNav" routerLink="/marketing/studio-carte" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">badge</span>
          Studio Cartes PVC
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'rewards'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">featured_seasonal_and_gifts</span>
          Catalogue Cadeaux
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'reports'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">insert_chart</span>
          Analytics Marketing
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'activity'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">history</span>
          Activité
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'redemptions'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">redeem</span>
          Lots
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'reminders'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">build_circle</span>
          Rappels CT
        </a>
        <a *ngIf="showLoyaltyReadNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'stations'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">ev_station</span>
          Stations
        </a>
        <a *ngIf="showMarketingSettingsNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'settings'}" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">tune</span>
          Réglages Fidélité
        </a>

        <!-- ADMINISTRATION -->
        <p *ngIf="showCommercialAdminNav" class="px-6 pt-5 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Administration</p>
        <a *ngIf="showCommercialAdminNav" routerLink="/admin/settings" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">settings</span>
          Paramètres
        </a>
        <a *ngIf="showCommercialAdminNav" routerLink="/admin/payment-terms" [class]="navLink" [routerLinkActive]="navLinkActive">
          <span class="material-symbols-outlined text-[20px]">payments</span>
          Conditions de paiement
        </a>
      </nav>

      <div class="px-4 mt-auto pt-4">
        <div class="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/[0.04] border border-white/5">
          <label class="relative w-10 h-10 rounded-full shrink-0 cursor-pointer group/avatar" title="Changer la photo de profil">
            <img *ngIf="currentUser?.avatar_url" [src]="currentUser?.avatar_url" class="w-10 h-10 rounded-full object-cover">
            <div *ngIf="!currentUser?.avatar_url" class="w-10 h-10 rounded-full bg-gradient-to-br from-[#15b9a3] to-[#006b5d] flex items-center justify-center text-white font-bold text-xs">
              {{ userInitials }}
            </div>
            <div class="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity">
              <span class="material-symbols-outlined text-white text-sm">photo_camera</span>
            </div>
            <input type="file" accept="image/*" class="hidden" (change)="onAvatarSelected($event)">
          </label>
          <div class="overflow-hidden">
            <p class="text-white text-sm font-semibold truncate">{{ userName }}</p>
            <p class="text-slate-400 text-[11px] truncate capitalize">{{ userRole }}</p>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }
  `]
})
export class SidebarComponent {
  currentUser: User | null = null;
  layoutService = inject(LayoutService);

  readonly navLink = 'group flex items-center gap-3 mx-3 my-0.5 px-4 py-2.5 rounded-2xl text-slate-300 border-l-[3px] border-transparent hover:text-white hover:bg-white/5 transition-all duration-200 font-headline text-sm tracking-wide';
  readonly navLinkActive = 'bg-gradient-to-r from-[#15b9a3]/25 to-[#15b9a3]/0 text-white border-[#15b9a3] shadow-sm';

  private toastService = inject(ToastService);

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.authService.uploadAvatar(file).subscribe({
      next: () => this.toastService.success('Photo de profil mise à jour.'),
      error: () => this.toastService.error("Erreur lors de l'envoi de la photo."),
    });
  }

  onNavClick(): void {
    // Ferme la sidebar après navigation sur mobile
    if (window.innerWidth < 1024) {
      this.layoutService.closeSidebar();
    }
  }

  get showCrmNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN, UserRoles.COMMERCIAL);
  }

  get showClientNav(): boolean {
    return this.authService.hasRole(UserRoles.CLIENT);
  }

  get showClientsNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN, UserRoles.COMMERCIAL);
  }

  get showStaffNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_COMMERCIAL, UserRoles.ADMIN_MARKETING, UserRoles.SUPER_ADMIN, UserRoles.COMMERCIAL);
  }

  /** Accès complet fidélité : admin marketing + marketing (bootstrap, gestion récompenses) */
  get showLoyaltyNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_MARKETING, UserRoles.SUPER_ADMIN, UserRoles.MARKETING);
  }

  /** Fidélité (comptes, catalogue, analytics) : réservé au service marketing. */
  get showLoyaltyReadNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_MARKETING, UserRoles.SUPER_ADMIN, UserRoles.MARKETING);
  }

  /** Réglages fidélité : admin marketing uniquement. */
  get showMarketingSettingsNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_MARKETING, UserRoles.SUPER_ADMIN);
  }

  /** Paramètres généraux (mentions légales devis, tarifs) : admin commercial uniquement. */
  get showCommercialAdminNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN_COMMERCIAL, UserRoles.SUPER_ADMIN);
  }

  get userName(): string {
    if (!this.currentUser) return 'Chargement...';
    return `${this.currentUser.first_name} ${this.currentUser.last_name.charAt(0)}.`;
  }

  get userRole(): string {
    const role = this.currentUser?.role;
    if (!role) return 'Utilisateur';
    return ROLE_LABELS[role] || role;
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';
    return `${this.currentUser.first_name.charAt(0)}${this.currentUser.last_name.charAt(0)}`.toUpperCase();
  }
}
