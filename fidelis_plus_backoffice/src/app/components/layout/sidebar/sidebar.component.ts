import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/auth.model';
import { UserRoles } from '../../../models/user-roles';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="bg-[#1a1831] h-screen w-64 fixed left-0 top-0 overflow-y-auto flex flex-col py-6 shadow-xl z-50">
      <div class="px-6 mb-10">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
            <span class="material-symbols-outlined text-white" style="font-variation-settings: 'FILL' 1;">precision_manufacturing</span>
          </div>
          <div>
            <h1 class="text-xl font-bold text-white tracking-tight">Mayelia CRM</h1>
            <p class="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">Precision Editorial</p>
          </div>
        </div>
      </div>
      
      <nav class="flex-1 space-y-1">
        <!-- ESPACE CLIENT -->
        <a *ngIf="showClientNav" routerLink="/client/dashboard" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]" [routerLinkActiveOptions]="{exact: true}" 
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">dashboard</span>
          Tableau de bord
        </a>
        <a *ngIf="showClientNav" routerLink="/client/fleet" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">directions_car</span>
          Ma Flotte
        </a>
        <a *ngIf="showClientNav" routerLink="/client/quotes" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">request_quote</span>
          Mes Devis
        </a>
        <a *ngIf="showClientNav" routerLink="/client/appointments" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">event</span>
          Mes Rendez-vous
        </a>

        <!-- CRM / ADMIN -->
        <a *ngIf="showCrmNav" routerLink="/dashboard" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]" [routerLinkActiveOptions]="{exact: true}" 
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">dashboard</span>
          Dashboard
        </a>
        <a *ngIf="showClientsNav" routerLink="/clients" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">group</span>
          Clients & Contacts
        </a>
        <a *ngIf="showCrmNav" routerLink="/prospection" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">analytics</span>
          Prospection
        </a>
        <a *ngIf="showCrmNav" routerLink="/vente" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">receipt_long</span>
          Devis
        </a>
        <a *ngIf="showCrmNav" routerLink="/fleet" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">directions_car</span>
          Flotte
        </a>
        <a *ngIf="showStaffNav" routerLink="/equipe" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">supervisor_account</span>
          Équipe
        </a>
        <a *ngIf="showLoyaltyNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'accounts'}" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">card_giftcard</span>
          Comptes Fidélité
        </a>
        <a *ngIf="showLoyaltyNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'bootstrap'}" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">badge</span>
          Studio Cartes PVC
        </a>
        <a *ngIf="showLoyaltyNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'rewards'}" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">featured_seasonal_and_gifts</span>
          Catalogue Cadeaux
        </a>
        <a *ngIf="showLoyaltyNav" routerLink="/marketing/fidelite" [queryParams]="{tab: 'reports'}" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">insert_chart</span>
          Analytics Marketing
        </a>
        <a *ngIf="showAdminNav" routerLink="/admin/stations" routerLinkActive="bg-white/5 border-[#15b9a3] text-[#15b9a3]"
           class="flex items-center gap-3 px-4 py-3 text-slate-400 border-l-4 border-transparent hover:text-white transition-colors hover:bg-white/10 hover:translate-x-1 duration-250 font-headline text-sm tracking-wide">
          <span class="material-symbols-outlined">ev_station</span>
          Stations
        </a>
      </nav>

      <div class="px-4 mt-auto">
        <div class="flex items-center gap-3 px-2 border-t border-white/5 pt-6">
          <div class="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-white font-bold text-xs border border-white/10">
            {{ userInitials }}
          </div>
          <div class="overflow-hidden">
            <p class="text-white text-sm font-semibold truncate">{{ userName }}</p>
            <p class="text-slate-500 text-xs truncate">{{ userRole }}</p>
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

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  get showCrmNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN, UserRoles.COMMERCIAL);
  }

  get showClientNav(): boolean {
    return this.authService.hasRole(UserRoles.CLIENT);
  }

  get showClientsNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN, UserRoles.COMMERCIAL, UserRoles.MARKETING);
  }

  get showStaffNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN);
  }

  get showLoyaltyNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN, UserRoles.MARKETING);
  }

  get showAdminNav(): boolean {
    return this.authService.hasRole(UserRoles.ADMIN);
  }

  get userName(): string {
    if (!this.currentUser) return 'Chargement...';
    return `${this.currentUser.first_name} ${this.currentUser.last_name.charAt(0)}.`;
  }

  get userRole(): string {
    return this.currentUser?.role || 'Utilisateur';
  }

  get userInitials(): string {
    if (!this.currentUser) return '?';
    return `${this.currentUser.first_name.charAt(0)}${this.currentUser.last_name.charAt(0)}`.toUpperCase();
  }
}
