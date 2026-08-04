import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TeamService, User } from '../../../services/team.service';
import { ToastService } from '../../../services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { ROLE_LABELS, ANY_ADMIN_ROLES } from '../../../models/user-roles';

@Component({
  selector: 'app-team-member-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">

      <a routerLink="/equipe" class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-outline hover:text-primary transition-colors">
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        Retour à l'équipe
      </a>

      <div *ngIf="loading()" class="py-24 flex flex-col items-center justify-center text-outline">
        <span class="material-symbols-outlined animate-spin text-primary text-5xl mb-3">sync</span>
        <p class="font-medium">Chargement du profil…</p>
      </div>

      <ng-container *ngIf="!loading() && user() as u">
        <!-- EN-TÊTE -->
        <section class="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-10 flex flex-col md:flex-row md:items-center gap-6">
          <img *ngIf="u.avatar_url" [src]="u.avatar_url" class="w-20 h-20 rounded-2xl object-cover shrink-0">
          <div *ngIf="!u.avatar_url" class="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface text-2xl font-black shrink-0">
            {{ u.first_name.charAt(0) }}{{ u.last_name.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-headline font-black text-on-surface">{{ u.first_name }} {{ u.last_name }}</h1>
              <span [class.bg-primary/10]="isAdminRole(u.role)" [class.text-primary]="isAdminRole(u.role)"
                    [class.bg-secondary/10]="u.role === 'commercial' || u.role === 'marketing'" [class.text-secondary]="u.role === 'commercial' || u.role === 'marketing'"
                    class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                {{ roleLabel(u.role) }}
              </span>
            </div>
            <p class="text-sm text-outline font-medium mt-1 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">mail</span>{{ u.email }}
            </p>
            <p *ngIf="u.phone" class="text-sm text-outline font-medium mt-0.5 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">call</span>{{ u.phone }}
            </p>
          </div>
          <div class="flex gap-2 shrink-0">
            <a [routerLink]="['/equipe/editer', u.id]" class="h-11 px-5 rounded-xl bg-surface-container-low text-on-surface text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-surface-container-high transition-colors">
              <span class="material-symbols-outlined text-sm">edit</span> Éditer
            </a>
          </div>
        </section>

        <!-- SERVICE COMMERCIAL -->
        <section *ngIf="u.role === 'commercial' || u.role === 'admin_commercial'" class="space-y-4">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline px-1">Activité commerciale</p>
          <div class="grid grid-cols-2 gap-6">
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Clients gérés</p>
              <p class="text-4xl font-headline font-black text-on-surface">{{ u.clients_count || 0 }}</p>
            </div>
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Prospects en portefeuille</p>
              <p class="text-4xl font-headline font-black text-on-surface">{{ u.prospects_count || 0 }}</p>
            </div>
          </div>
          <a *ngIf="u.role === 'commercial'" [routerLink]="['/equipe', u.id, 'performances']"
             class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline">
            Voir les performances détaillées <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </section>

        <!-- SERVICE MARKETING -->
        <section *ngIf="u.role === 'marketing' || u.role === 'admin_marketing'" class="space-y-4">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline px-1">Activité fidélité</p>
          <p class="text-xs text-outline -mt-2">Le service marketing ne gère pas de prospects commerciaux : il crée des comptes de fidélité et traite les demandes du programme.</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Lots traités (total)</p>
              <p class="text-4xl font-headline font-black text-on-surface">{{ u.redemptions_handled_count || 0 }}</p>
            </div>
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Livrés</p>
              <p class="text-4xl font-headline font-black text-primary">{{ u.detail?.marketing?.redemptions_delivered || 0 }}</p>
            </div>
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Annulés</p>
              <p class="text-4xl font-headline font-black text-error">{{ u.detail?.marketing?.redemptions_cancelled || 0 }}</p>
            </div>
          </div>
          <a routerLink="/marketing/dashboard" class="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline">
            Ouvrir le tableau de bord marketing <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </a>
        </section>

        <!-- CAISSIÈRE STATION -->
        <section *ngIf="u.role === 'caissier'" class="space-y-4">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-outline px-1">Activité en station</p>
          <p class="text-xs text-outline -mt-2">Les caissières ne gèrent pas de portefeuille : elles scannent les cartes fidélité pour créditer des points et inscrivent les nouveaux clients particuliers au guichet.</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Scans effectués</p>
              <p class="text-4xl font-headline font-black text-on-surface">{{ u.scans_count || 0 }}</p>
            </div>
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Points distribués</p>
              <p class="text-4xl font-headline font-black text-primary">{{ u.detail?.cashier?.points_credited || 0 }}</p>
            </div>
            <div class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
              <p class="text-[10px] font-black uppercase text-outline tracking-widest mb-1">Dernier scan</p>
              <p class="text-lg font-headline font-black text-on-surface">{{ (u.detail?.cashier?.last_scan_at | date:'dd/MM/yy HH:mm') || '—' }}</p>
            </div>
          </div>
          <div *ngIf="u.detail?.cashier?.top_station as ts" class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-6 flex items-center gap-4">
            <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined">ev_station</span>
            </div>
            <div>
              <p class="text-[10px] font-black uppercase text-outline tracking-widest">Station la plus active</p>
              <p class="text-sm font-black text-on-surface">{{ ts.station_name }} — {{ ts.scans_count }} scan(s)</p>
            </div>
          </div>
        </section>

        <!-- SUPER ADMIN -->
        <section *ngIf="u.role === 'super_admin'" class="bg-white rounded-[2rem] border border-outline-variant/10 shadow-sm p-8">
          <p class="text-sm text-outline font-medium">Ce profil a un accès complet aux services commercial et marketing — il n'a pas de portefeuille ou d'activité propre à afficher ici.</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `],
})
export class TeamMemberDetailComponent implements OnInit {
  private teamService = inject(TeamService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  user = signal<User | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/equipe']);
      return;
    }
    this.teamService.getById(id).subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Impossible de charger ce profil.');
        this.router.navigate(['/equipe']);
      },
    });
  }

  isAdminRole(role: string): boolean {
    return (ANY_ADMIN_ROLES as string[]).includes(role);
  }

  roleLabel(role: string): string {
    return ROLE_LABELS[role] || role;
  }
}
